import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';

export default function TiposEvento() {
  const navigate = useNavigate();
  const [tipos, setTipos] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);

  async function carregarTipos() {
    const res = await api.get('/admin/tipos-evento');
    setTipos(res.data);
  }

  useEffect(() => {
    carregarTipos();
  }, []);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir este tipo de evento?')) return;

    try {
      await api.delete(`/admin/tipos-evento/${selecionadoId}`);
      setSelecionadoId(null);
      carregarTipos();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Erro ao excluir tipo de evento.');
    }
  }

  const selecionado = tipos.find((t) => t.id === selecionadoId);
  const podeExcluir = !!selecionado && selecionado.id !== 1;

  return (
    <div>
      <h1 className="h3 mb-3">Tipos de Evento</h1>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        podeExcluir={podeExcluir}
        onNovo={() => navigate('/admin/tipos-evento/novo')}
        onEditar={() => navigate(`/admin/tipos-evento/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarTipos}
      />
      {selecionado?.id === 1 && (
        <p className="text-body-secondary small mt-n2 mb-3">
          O tipo padrão "Exame de Faixa" não pode ser excluído.
        </p>
      )}

      <AdminDataTable
        rows={tipos}
        selectedId={selecionadoId}
        onSelectRow={selecionarLinha}
        emptyMessage="Nenhum tipo de evento cadastrado."
        columns={[
          { key: 'nome', label: 'Nome', sortable: true },
          { key: 'cobravel', label: 'Cobrável', sortable: true, render: (tipo) => (tipo.cobravel ? 'Sim' : 'Não') },
          {
            key: 'valor',
            label: 'Valor',
            align: 'end',
            sortable: true,
            render: (tipo) => (tipo.valor != null ? `R$ ${Number(tipo.valor).toFixed(2)}` : '-'),
          },
        ]}
      />
    </div>
  );
}
