import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';

export default function Produtos() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);

  async function carregarProdutos() {
    const res = await api.get('/admin/produtos');
    setProdutos(res.data);
  }

  useEffect(() => {
    carregarProdutos();
  }, []);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
      await api.delete(`/admin/produtos/${selecionadoId}`);
      setSelecionadoId(null);
      carregarProdutos();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível excluir o produto.');
    }
  }

  return (
    <div>
      <h1 className="h3 mb-3">Produtos</h1>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/produtos/novo')}
        onEditar={() => navigate(`/admin/produtos/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarProdutos}
      />

      <AdminDataTable
        rows={produtos}
        selectedId={selecionadoId}
        onSelectRow={selecionarLinha}
        emptyMessage="Nenhum produto cadastrado."
        columns={[
          { key: 'descricao', label: 'Descrição', sortable: true },
          { key: 'tipoProduto', label: 'Tipo', sortable: true, render: (produto) => produto.tipoProduto || '-' },
          {
            key: 'controlaEstoque',
            label: 'Controla estoque',
            sortable: true,
            render: (produto) => (produto.controlaEstoque ? 'Sim' : 'Não'),
          },
          {
            key: 'ativo',
            label: 'Status',
            sortable: true,
            render: (produto) => (
              <span className={`badge ${produto.ativo ? 'text-bg-success' : 'text-bg-secondary'}`}>
                {produto.ativo ? 'Ativo' : 'Inativo'}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
