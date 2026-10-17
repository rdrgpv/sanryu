import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';

export default function Unidades() {
  const navigate = useNavigate();
  const [unidades, setUnidades] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);

  async function carregarUnidades() {
    const res = await api.get('/admin/unidades');
    setUnidades(res.data);
  }

  useEffect(() => {
    carregarUnidades();
  }, []);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir esta unidade?')) return;

    try {
      await api.delete(`/admin/unidades/${selecionadoId}`);
      setSelecionadoId(null);
      carregarUnidades();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível excluir a unidade.');
    }
  }

  return (
    <div>
      <h1 className="h3 mb-3">Unidades</h1>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/unidades/novo')}
        onEditar={() => navigate(`/admin/unidades/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarUnidades}
      />

      <AdminDataTable
        rows={unidades}
        selectedId={selecionadoId}
        onSelectRow={selecionarLinha}
        emptyMessage="Nenhuma unidade cadastrada."
        columns={[
          { key: 'nome', label: 'Nome', sortable: true },
          { key: 'telefone', label: 'Telefone', render: (unidade) => unidade.telefone || '-' },
          { key: 'endereco', label: 'Endereço', render: (unidade) => unidade.endereco || '-' },
          {
            key: 'ativo',
            label: 'Situação',
            sortable: true,
            render: (unidade) => (
              <span className={`badge ${unidade.ativo ? 'text-bg-success' : 'text-bg-secondary'}`}>
                {unidade.ativo ? 'Ativa' : 'Inativa'}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
