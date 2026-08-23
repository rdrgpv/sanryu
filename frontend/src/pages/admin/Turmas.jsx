import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';

export default function Turmas() {
  const navigate = useNavigate();
  const [turmas, setTurmas] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);

  async function carregarTurmas() {
    const res = await api.get('/admin/turmas');
    setTurmas(res.data);
  }

  useEffect(() => {
    carregarTurmas();
  }, []);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir esta turma?')) return;
    await api.delete(`/admin/turmas/${selecionadoId}`);
    setSelecionadoId(null);
    carregarTurmas();
  }

  return (
    <div>
      <h1 className="h3 mb-3">Turmas</h1>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/turmas/novo')}
        onEditar={() => navigate(`/admin/turmas/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarTurmas}
      />

      <AdminDataTable
        rows={turmas}
        selectedId={selecionadoId}
        onSelectRow={selecionarLinha}
        emptyMessage="Nenhuma turma cadastrada."
        columns={[
          { key: 'nome', label: 'Nome', sortable: true },
          { key: 'modalidade', label: 'Modalidade', sortable: true },
          { key: 'nivel', label: 'Nível', sortable: true },
          {
            key: 'instrutor',
            label: 'Instrutor',
            sortable: true,
            sortValue: (turma) => turma.instrutor?.nome || '',
            render: (turma) => turma.instrutor?.nome || '-',
          },
          { key: 'diaSemana', label: 'Dias' },
          {
            key: 'horario',
            label: 'Horário',
            render: (turma) => `${turma.horaInicio} — ${turma.horaFim}`,
          },
          { key: 'vagas', label: 'Vagas', align: 'center', sortable: true },
        ]}
      />
    </div>
  );
}
