import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';
import { formatarMoeda } from '../../utils/formato.js';
import { labelPeriodicidade, mesesPeriodicidade } from '../../utils/planos.js';

export default function Planos() {
  const navigate = useNavigate();
  const [planos, setPlanos] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);

  async function carregarPlanos() {
    const res = await api.get('/admin/planos');
    setPlanos(res.data);
  }

  useEffect(() => {
    carregarPlanos();
  }, []);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir este plano?')) return;

    try {
      await api.delete(`/admin/planos/${selecionadoId}`);
      setSelecionadoId(null);
      carregarPlanos();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível excluir o plano.');
    }
  }

  return (
    <div>
      <h1 className="h3 mb-3">Planos</h1>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/planos/novo')}
        onEditar={() => navigate(`/admin/planos/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarPlanos}
      />

      <AdminDataTable
        rows={planos}
        selectedId={selecionadoId}
        onSelectRow={selecionarLinha}
        emptyMessage="Nenhum plano cadastrado."
        columns={[
          { key: 'nome', label: 'Nome', sortable: true },
          {
            key: 'periodicidade',
            label: 'Periodicidade',
            sortable: true,
            render: (plano) => labelPeriodicidade(plano.periodicidade),
          },
          {
            key: 'valor',
            label: 'Valor',
            align: 'end',
            sortable: true,
            sortValue: (plano) => Number(plano.valor),
            render: (plano) => formatarMoeda(plano.valor),
          },
          {
            key: 'mensal',
            label: 'Equivale por mês',
            align: 'end',
            render: (plano) => formatarMoeda(Number(plano.valor) / mesesPeriodicidade(plano.periodicidade)),
          },
          { key: 'unidade', label: 'Unidade', render: (plano) => plano.unidade?.nome || 'Todas' },
          {
            key: 'ativo',
            label: 'Situação',
            sortable: true,
            render: (plano) => (
              <span className={`badge ${plano.ativo ? 'text-bg-success' : 'text-bg-secondary'}`}>
                {plano.ativo ? 'Ativo' : 'Inativo'}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
