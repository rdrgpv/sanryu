import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';

export default function Fornecedores() {
  const navigate = useNavigate();
  const [fornecedores, setFornecedores] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);

  async function carregarFornecedores() {
    const res = await api.get('/admin/fornecedores');
    setFornecedores(res.data);
  }

  useEffect(() => {
    carregarFornecedores();
  }, []);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir este fornecedor?')) return;
    try {
      await api.delete(`/admin/fornecedores/${selecionadoId}`);
      setSelecionadoId(null);
      carregarFornecedores();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível excluir o fornecedor.');
    }
  }

  return (
    <div>
      <h1 className="h3 mb-3">Fornecedores</h1>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/fornecedores/novo')}
        onEditar={() => navigate(`/admin/fornecedores/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarFornecedores}
      />

      <AdminDataTable
        rows={fornecedores}
        selectedId={selecionadoId}
        onSelectRow={selecionarLinha}
        emptyMessage="Nenhum fornecedor cadastrado."
        columns={[
          { key: 'nome', label: 'Nome', sortable: true },
          { key: 'cnpjCpf', label: 'CNPJ/CPF', sortable: true, render: (f) => f.cnpjCpf || '-' },
          { key: 'telefone', label: 'Telefone', render: (f) => f.telefone || '-' },
          { key: 'email', label: 'Email', sortable: true, render: (f) => f.email || '-' },
          {
            key: 'ativo',
            label: 'Status',
            sortable: true,
            render: (f) => (
              <span className={`badge ${f.ativo ? 'text-bg-success' : 'text-bg-secondary'}`}>
                {f.ativo ? 'Ativo' : 'Inativo'}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
