import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';

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

      <CTable hover responsive className="bg-white">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Nome</CTableHeaderCell>
            <CTableHeaderCell>Modalidade</CTableHeaderCell>
            <CTableHeaderCell>Nível</CTableHeaderCell>
            <CTableHeaderCell>Instrutor</CTableHeaderCell>
            <CTableHeaderCell>Dias</CTableHeaderCell>
            <CTableHeaderCell>Horário</CTableHeaderCell>
            <CTableHeaderCell>Vagas</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {turmas.map((turma) => (
            <CTableRow key={turma.id} active={selecionadoId === turma.id} onClick={() => selecionarLinha(turma.id)}>
              <CTableDataCell>{turma.nome}</CTableDataCell>
              <CTableDataCell>{turma.modalidade}</CTableDataCell>
              <CTableDataCell>{turma.nivel}</CTableDataCell>
              <CTableDataCell>{turma.instrutor?.nome || '-'}</CTableDataCell>
              <CTableDataCell>{turma.diaSemana}</CTableDataCell>
              <CTableDataCell>
                {turma.horaInicio} — {turma.horaFim}
              </CTableDataCell>
              <CTableDataCell>{turma.vagas}</CTableDataCell>
            </CTableRow>
          ))}
          {turmas.length === 0 && (
            <CTableRow>
              <CTableDataCell colSpan={7} className="text-body-secondary">
                Nenhuma turma cadastrada.
              </CTableDataCell>
            </CTableRow>
          )}
        </CTableBody>
      </CTable>
    </div>
  );
}
