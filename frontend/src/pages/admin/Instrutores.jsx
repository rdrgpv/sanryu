import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';

export default function Instrutores() {
  const navigate = useNavigate();
  const [instrutores, setInstrutores] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);

  async function carregarInstrutores() {
    const res = await api.get('/admin/instrutores');
    setInstrutores(res.data);
  }

  useEffect(() => {
    carregarInstrutores();
  }, []);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir este instrutor?')) return;
    await api.delete(`/admin/instrutores/${selecionadoId}`);
    setSelecionadoId(null);
    carregarInstrutores();
  }

  return (
    <div>
      <h1 className="h3 mb-3">Instrutores</h1>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/instrutores/novo')}
        onEditar={() => navigate(`/admin/instrutores/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarInstrutores}
      />

      <AdminDataTable
        rows={instrutores}
        selectedId={selecionadoId}
        onSelectRow={selecionarLinha}
        emptyMessage="Nenhum instrutor cadastrado."
        columns={[
          { key: 'nome', label: 'Nome', sortable: true },
          {
            key: 'faixa',
            label: 'Faixa',
            sortable: true,
            sortValue: (instrutor) => instrutor.faixa?.nome || '',
            render: (instrutor) =>
              instrutor.faixa ? (
                <span className="d-flex align-items-center gap-2">
                  <span
                    style={{
                      display: 'inline-block',
                      width: '1rem',
                      height: '1rem',
                      borderRadius: '50%',
                      background: instrutor.faixa.cor,
                      border: '1px solid rgba(0,0,0,0.15)',
                      flexShrink: 0,
                    }}
                  />
                  {instrutor.faixa.nome}
                  {instrutor.faixa.grau ? ` ${instrutor.faixa.grau}º Dan` : ''}
                </span>
              ) : (
                '-'
              ),
          },
          { key: 'email', label: 'Email', sortable: true, render: (instrutor) => instrutor.email || '-' },
          { key: 'especialidade', label: 'Especialidade', render: (instrutor) => instrutor.especialidade || '-' },
          {
            key: 'bio',
            label: 'Bio',
            render: (instrutor) => <span style={{ display: 'inline-block', maxWidth: 320 }}>{instrutor.bio || '-'}</span>,
          },
        ]}
      />
    </div>
  );
}
