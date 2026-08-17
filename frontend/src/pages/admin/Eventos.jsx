import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilList } from '@coreui/icons';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';
import { formatarDataHora } from '../../utils/formato.js';

export default function Eventos() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);

  async function carregarEventos() {
    const res = await api.get('/admin/eventos');
    setEventos(res.data);
  }

  useEffect(() => {
    carregarEventos();
  }, []);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir este evento?')) return;
    await api.delete(`/admin/eventos/${selecionadoId}`);
    setSelecionadoId(null);
    carregarEventos();
  }

  return (
    <div>
      <h1 className="h3 mb-3">Eventos</h1>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/eventos/novo')}
        onEditar={() => navigate(`/admin/eventos/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarEventos}
        extra={
          <CButton
            color="secondary"
            variant="outline"
            disabled={!selecionadoId}
            onClick={() => navigate(`/admin/eventos/${selecionadoId}/inscricoes`)}
          >
            <CIcon icon={cilList} className="me-1" />
            Inscrições
          </CButton>
        }
      />

      <CTable hover responsive className="bg-white">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Banner</CTableHeaderCell>
            <CTableHeaderCell>Nome</CTableHeaderCell>
            <CTableHeaderCell>Tipo</CTableHeaderCell>
            <CTableHeaderCell>Data</CTableHeaderCell>
            <CTableHeaderCell>Local</CTableHeaderCell>
            <CTableHeaderCell>Status</CTableHeaderCell>
            <CTableHeaderCell>Valor</CTableHeaderCell>
            <CTableHeaderCell>Publicado</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {eventos.map((evento) => (
            <CTableRow key={evento.id} active={selecionadoId === evento.id} onClick={() => selecionarLinha(evento.id)}>
              <CTableDataCell>
                {evento.banner ? (
                  <img src={evento.banner} alt="" style={{ width: 60, height: 40, objectFit: 'cover' }} />
                ) : (
                  '-'
                )}
              </CTableDataCell>
              <CTableDataCell>{evento.nome}</CTableDataCell>
              <CTableDataCell>{evento.tipoEvento?.nome || '-'}</CTableDataCell>
              <CTableDataCell>{formatarDataHora(evento.data)}</CTableDataCell>
              <CTableDataCell>{evento.local || '-'}</CTableDataCell>
              <CTableDataCell>{evento.status}</CTableDataCell>
              <CTableDataCell>{evento.valor != null ? `R$ ${Number(evento.valor).toFixed(2)}` : '-'}</CTableDataCell>
              <CTableDataCell>{evento.publicado ? 'Sim' : 'Não'}</CTableDataCell>
            </CTableRow>
          ))}
          {eventos.length === 0 && (
            <CTableRow>
              <CTableDataCell colSpan={8} className="text-body-secondary">
                Nenhum evento cadastrado.
              </CTableDataCell>
            </CTableRow>
          )}
        </CTableBody>
      </CTable>
    </div>
  );
}
