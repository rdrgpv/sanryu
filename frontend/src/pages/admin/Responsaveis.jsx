import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CFormInput } from '@coreui/react';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';

export default function Responsaveis() {
  const navigate = useNavigate();
  const [responsaveis, setResponsaveis] = useState([]);
  const [busca, setBusca] = useState('');
  const [selecionadoId, setSelecionadoId] = useState(null);

  async function carregarResponsaveis() {
    const res = await api.get('/admin/responsaveis', { params: busca ? { busca } : {} });
    setResponsaveis(res.data);
  }

  useEffect(() => {
    const timeout = setTimeout(carregarResponsaveis, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir este responsável?')) return;

    try {
      await api.delete(`/admin/responsaveis/${selecionadoId}`);
      setSelecionadoId(null);
      carregarResponsaveis();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível excluir o responsável.');
    }
  }

  return (
    <div>
      <h1 className="h3 mb-3">Responsáveis</h1>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/responsaveis/novo')}
        onEditar={() => navigate(`/admin/responsaveis/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarResponsaveis}
      />

      <CFormInput
        className="mb-3"
        style={{ maxWidth: 360 }}
        placeholder="Buscar por nome, CPF ou email..."
        value={busca}
        onChange={(event) => setBusca(event.target.value)}
      />

      <AdminDataTable
        rows={responsaveis}
        selectedId={selecionadoId}
        onSelectRow={selecionarLinha}
        emptyMessage="Nenhum responsável cadastrado."
        columns={[
          { key: 'nome', label: 'Nome', sortable: true },
          { key: 'cpf', label: 'CPF', render: (responsavel) => responsavel.cpf || '-' },
          { key: 'telefone', label: 'Telefone', render: (responsavel) => responsavel.telefone || '-' },
          { key: 'email', label: 'Email', render: (responsavel) => responsavel.email || '-' },
          {
            key: 'alunos',
            label: 'Alunos',
            sortable: true,
            sortValue: (responsavel) => responsavel.alunos?.length || 0,
            render: (responsavel) => (responsavel.alunos || []).map((aluno) => aluno.nome).join(', ') || '-',
          },
        ]}
      />
    </div>
  );
}
