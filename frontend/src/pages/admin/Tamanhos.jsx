import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';

export default function Tamanhos() {
  const navigate = useNavigate();
  const [tamanhos, setTamanhos] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);

  async function carregarTamanhos() {
    const res = await api.get('/admin/tamanhos');
    setTamanhos(res.data);
  }

  useEffect(() => {
    carregarTamanhos();
  }, []);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir este tamanho?')) return;
    try {
      await api.delete(`/admin/tamanhos/${selecionadoId}`);
      setSelecionadoId(null);
      carregarTamanhos();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível excluir o tamanho.');
    }
  }

  return (
    <div>
      <h1 className="h3 mb-3">Tamanhos</h1>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/tamanhos/novo')}
        onEditar={() => navigate(`/admin/tamanhos/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarTamanhos}
      />

      <AdminDataTable
        rows={tamanhos}
        selectedId={selecionadoId}
        onSelectRow={selecionarLinha}
        emptyMessage="Nenhum tamanho cadastrado."
        pageSize={25}
        columns={[
          { key: 'descricao', label: 'Descrição', sortable: true },
          { key: 'ordem', label: 'Ordem', align: 'center', sortable: true, render: (tamanho) => tamanho.ordem ?? '-' },
          {
            key: 'ativo',
            label: 'Status',
            sortable: true,
            render: (tamanho) => (
              <span className={`badge ${tamanho.ativo ? 'text-bg-success' : 'text-bg-secondary'}`}>
                {tamanho.ativo ? 'Ativo' : 'Inativo'}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
