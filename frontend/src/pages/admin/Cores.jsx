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

export default function Cores() {
  const navigate = useNavigate();
  const [cores, setCores] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);

  async function carregarCores() {
    const res = await api.get('/admin/cores');
    setCores(res.data);
  }

  useEffect(() => {
    carregarCores();
  }, []);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir esta cor?')) return;
    try {
      await api.delete(`/admin/cores/${selecionadoId}`);
      setSelecionadoId(null);
      carregarCores();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível excluir a cor.');
    }
  }

  return (
    <div>
      <h1 className="h3 mb-3">Cores</h1>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/cores/novo')}
        onEditar={() => navigate(`/admin/cores/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarCores}
      />

      <CTable hover responsive className="bg-white">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell></CTableHeaderCell>
            <CTableHeaderCell>Descrição</CTableHeaderCell>
            <CTableHeaderCell>Status</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {cores.map((cor) => (
            <CTableRow key={cor.id} active={selecionadoId === cor.id} onClick={() => selecionarLinha(cor.id)}>
              <CTableDataCell>
                <span
                  style={{
                    display: 'inline-block',
                    width: '1.4rem',
                    height: '1.4rem',
                    borderRadius: '50%',
                    background: cor.corHex || '#ccc',
                    border: '1px solid rgba(0,0,0,0.15)',
                  }}
                />
              </CTableDataCell>
              <CTableDataCell>{cor.descricao}</CTableDataCell>
              <CTableDataCell>{cor.ativo ? 'Ativa' : 'Inativa'}</CTableDataCell>
            </CTableRow>
          ))}
          {cores.length === 0 && (
            <CTableRow>
              <CTableDataCell colSpan={3} className="text-body-secondary">
                Nenhuma cor cadastrada.
              </CTableDataCell>
            </CTableRow>
          )}
        </CTableBody>
      </CTable>
    </div>
  );
}
