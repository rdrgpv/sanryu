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

function formatarValor(valor) {
  return valor != null ? `R$ ${Number(valor).toFixed(2)}` : '-';
}

export default function Faixas() {
  const navigate = useNavigate();
  const [faixas, setFaixas] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);

  async function carregarFaixas() {
    const res = await api.get('/admin/faixas');
    setFaixas(res.data);
  }

  useEffect(() => {
    carregarFaixas();
  }, []);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir esta faixa?')) return;
    await api.delete(`/admin/faixas/${selecionadoId}`);
    setSelecionadoId(null);
    carregarFaixas();
  }

  return (
    <div>
      <h1 className="h3 mb-3">Faixas</h1>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/faixas/novo')}
        onEditar={() => navigate(`/admin/faixas/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarFaixas}
      />

      <CTable hover responsive className="bg-white">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Cor</CTableHeaderCell>
            <CTableHeaderCell>Nome</CTableHeaderCell>
            <CTableHeaderCell>Grau</CTableHeaderCell>
            <CTableHeaderCell>Ordem</CTableHeaderCell>
            <CTableHeaderCell>Valor c/ carteirinha</CTableHeaderCell>
            <CTableHeaderCell>Valor s/ carteirinha</CTableHeaderCell>
            <CTableHeaderCell>Status</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {faixas.map((faixa) => (
            <CTableRow
              key={faixa.id}
              active={selecionadoId === faixa.id}
              onClick={() => selecionarLinha(faixa.id)}
            >
              <CTableDataCell>
                <span
                  style={{
                    display: 'inline-block',
                    width: '1.4rem',
                    height: '1.4rem',
                    borderRadius: '50%',
                    background: faixa.cor,
                    border: '1px solid rgba(0,0,0,0.15)',
                  }}
                />
              </CTableDataCell>
              <CTableDataCell>{faixa.nome}</CTableDataCell>
              <CTableDataCell>{faixa.grau ?? '-'}</CTableDataCell>
              <CTableDataCell>{faixa.ordem}</CTableDataCell>
              <CTableDataCell>{formatarValor(faixa.valorComCarteirinha)}</CTableDataCell>
              <CTableDataCell>{formatarValor(faixa.valorSemCarteirinha)}</CTableDataCell>
              <CTableDataCell>{faixa.ativo ? 'Ativa' : 'Inativa'}</CTableDataCell>
            </CTableRow>
          ))}
          {faixas.length === 0 && (
            <CTableRow>
              <CTableDataCell colSpan={7} className="text-body-secondary">
                Nenhuma faixa cadastrada.
              </CTableDataCell>
            </CTableRow>
          )}
        </CTableBody>
      </CTable>
    </div>
  );
}
