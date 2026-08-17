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

      <CTable hover responsive className="bg-white">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Nome</CTableHeaderCell>
            <CTableHeaderCell>Faixa</CTableHeaderCell>
            <CTableHeaderCell>Email</CTableHeaderCell>
            <CTableHeaderCell>Especialidade</CTableHeaderCell>
            <CTableHeaderCell>Bio</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {instrutores.map((instrutor) => (
            <CTableRow
              key={instrutor.id}
              active={selecionadoId === instrutor.id}
              onClick={() => selecionarLinha(instrutor.id)}
            >
              <CTableDataCell>{instrutor.nome}</CTableDataCell>
              <CTableDataCell>
                {instrutor.faixa ? (
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
                    {instrutor.faixa.grau ? ` ${instrutor.faixa.grau}º grau` : ''}
                  </span>
                ) : (
                  '-'
                )}
              </CTableDataCell>
              <CTableDataCell>{instrutor.email || '-'}</CTableDataCell>
              <CTableDataCell>{instrutor.especialidade || '-'}</CTableDataCell>
              <CTableDataCell style={{ maxWidth: 320 }}>{instrutor.bio || '-'}</CTableDataCell>
            </CTableRow>
          ))}
          {instrutores.length === 0 && (
            <CTableRow>
              <CTableDataCell colSpan={5} className="text-body-secondary">
                Nenhum instrutor cadastrado.
              </CTableDataCell>
            </CTableRow>
          )}
        </CTableBody>
      </CTable>
    </div>
  );
}
