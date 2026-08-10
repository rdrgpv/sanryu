import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Toolbar from '../../components/Toolbar.jsx';

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
      <h1 className="admin__title">Turmas</h1>

      <Toolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/turmas/novo')}
        onEditar={() => navigate(`/admin/turmas/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarTurmas}
      />

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Modalidade</th>
              <th>Nível</th>
              <th>Instrutor</th>
              <th>Dias</th>
              <th>Horário</th>
              <th>Vagas</th>
            </tr>
          </thead>
          <tbody>
            {turmas.map((turma) => (
              <tr
                key={turma.id}
                className={selecionadoId === turma.id ? 'is-selected' : ''}
                onClick={() => selecionarLinha(turma.id)}
              >
                <td>{turma.nome}</td>
                <td>{turma.modalidade}</td>
                <td>{turma.nivel}</td>
                <td>{turma.instrutor?.nome || '-'}</td>
                <td>{turma.diaSemana}</td>
                <td>
                  {turma.horaInicio} — {turma.horaFim}
                </td>
                <td>{turma.vagas}</td>
              </tr>
            ))}
            {turmas.length === 0 && (
              <tr>
                <td colSpan={7}>Nenhuma turma cadastrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
