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

export default function TiposEvento() {
  const navigate = useNavigate();
  const [tipos, setTipos] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);

  async function carregarTipos() {
    const res = await api.get('/admin/tipos-evento');
    setTipos(res.data);
  }

  useEffect(() => {
    carregarTipos();
  }, []);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir este tipo de evento?')) return;

    try {
      await api.delete(`/admin/tipos-evento/${selecionadoId}`);
      setSelecionadoId(null);
      carregarTipos();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Erro ao excluir tipo de evento.');
    }
  }

  const selecionado = tipos.find((t) => t.id === selecionadoId);
  const podeExcluir = !!selecionado && selecionado.id !== 1;

  return (
    <div>
      <h1 className="h3 mb-3">Tipos de Evento</h1>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        podeExcluir={podeExcluir}
        onNovo={() => navigate('/admin/tipos-evento/novo')}
        onEditar={() => navigate(`/admin/tipos-evento/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarTipos}
      />
      {selecionado?.id === 1 && (
        <p className="text-body-secondary small mt-n2 mb-3">
          O tipo padrão "Exame de Faixa" não pode ser excluído.
        </p>
      )}

      <CTable hover responsive className="bg-white">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Nome</CTableHeaderCell>
            <CTableHeaderCell>Cobrável</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {tipos.map((tipo) => (
            <CTableRow key={tipo.id} active={selecionadoId === tipo.id} onClick={() => selecionarLinha(tipo.id)}>
              <CTableDataCell>{tipo.nome}</CTableDataCell>
              <CTableDataCell>{tipo.cobravel ? 'Sim' : 'Não'}</CTableDataCell>
            </CTableRow>
          ))}
          {tipos.length === 0 && (
            <CTableRow>
              <CTableDataCell colSpan={2} className="text-body-secondary">
                Nenhum tipo de evento cadastrado.
              </CTableDataCell>
            </CTableRow>
          )}
        </CTableBody>
      </CTable>
    </div>
  );
}
