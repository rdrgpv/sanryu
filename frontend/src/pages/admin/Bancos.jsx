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

export default function Bancos() {
  const navigate = useNavigate();
  const [bancos, setBancos] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);

  async function carregarBancos() {
    const res = await api.get('/admin/bancos');
    setBancos(res.data);
  }

  useEffect(() => {
    carregarBancos();
  }, []);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir esta configuração Pix?')) return;
    await api.delete(`/admin/bancos/${selecionadoId}`);
    setSelecionadoId(null);
    carregarBancos();
  }

  return (
    <div>
      <h1 className="h3 mb-2">Configuração Pix</h1>
      <p className="text-body-secondary mb-3">
        A conta Pix usada para gerar o QR code de pagamento dos eventos é a primeira desta lista.
      </p>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/bancos/novo')}
        onEditar={() => navigate(`/admin/bancos/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarBancos}
      />

      <CTable hover responsive className="bg-white">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Nome</CTableHeaderCell>
            <CTableHeaderCell>Titular</CTableHeaderCell>
            <CTableHeaderCell>Tipo de chave</CTableHeaderCell>
            <CTableHeaderCell>Chave Pix</CTableHeaderCell>
            <CTableHeaderCell>Cidade</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {bancos.map((banco) => (
            <CTableRow key={banco.id} active={selecionadoId === banco.id} onClick={() => selecionarLinha(banco.id)}>
              <CTableDataCell>{banco.nome}</CTableDataCell>
              <CTableDataCell>{banco.titular}</CTableDataCell>
              <CTableDataCell>{banco.tipoChave}</CTableDataCell>
              <CTableDataCell>{banco.chavePix}</CTableDataCell>
              <CTableDataCell>{banco.cidade}</CTableDataCell>
            </CTableRow>
          ))}
          {bancos.length === 0 && (
            <CTableRow>
              <CTableDataCell colSpan={5} className="text-body-secondary">
                Nenhuma configuração Pix cadastrada.
              </CTableDataCell>
            </CTableRow>
          )}
        </CTableBody>
      </CTable>
    </div>
  );
}
