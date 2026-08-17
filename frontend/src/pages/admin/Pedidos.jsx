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
  CBadge,
} from '@coreui/react';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';
import { formatarMoeda, formatarDataHora } from '../../utils/formato.js';

const SITUACOES = {
  P: { label: 'Pendente', cor: 'secondary' },
  C: { label: 'Compra solicitada', cor: 'info' },
  F: { label: 'Entregue', cor: 'success' },
  E: { label: 'Cancelado', cor: 'danger' },
};

export default function Pedidos() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);

  async function carregarPedidos() {
    const res = await api.get('/admin/pedidos');
    setPedidos(res.data);
  }

  useEffect(() => {
    carregarPedidos();
  }, []);

  const selecionado = pedidos.find((p) => p.id === selecionadoId) || null;

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir este pedido?')) return;
    try {
      await api.delete(`/admin/pedidos/${selecionadoId}`);
      setSelecionadoId(null);
      carregarPedidos();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível excluir o pedido.');
    }
  }

  async function handleEntregar() {
    if (!selecionado) return;
    if (!window.confirm('Confirmar entrega deste pedido? Isso vai baixar o estoque.')) return;
    try {
      await api.post(`/admin/pedidos/${selecionado.id}/entregar`);
      carregarPedidos();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível entregar o pedido.');
    }
  }

  return (
    <div>
      <h1 className="h3 mb-3">Pedidos</h1>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        podeExcluir={selecionado?.situacao === 'P'}
        onNovo={() => navigate('/admin/pedidos/novo')}
        onEditar={() => navigate(`/admin/pedidos/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarPedidos}
        extra={
          <>
            <CButton
              color="secondary"
              variant="outline"
              disabled={selecionado?.situacao !== 'P'}
              onClick={() => navigate(`/admin/pedidos/${selecionadoId}/gerar-pedido-compra`)}
            >
              Gerar pedido de compra
            </CButton>
            <CButton
              color="secondary"
              variant="outline"
              disabled={!selecionado || !['P', 'C'].includes(selecionado.situacao)}
              onClick={handleEntregar}
            >
              Entregar
            </CButton>
          </>
        }
      />

      <CTable hover responsive className="bg-white">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Cliente</CTableHeaderCell>
            <CTableHeaderCell>Telefone</CTableHeaderCell>
            <CTableHeaderCell>Data</CTableHeaderCell>
            <CTableHeaderCell>Situação</CTableHeaderCell>
            <CTableHeaderCell>Total</CTableHeaderCell>
            <CTableHeaderCell>Previsão de entrega</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {pedidos.map((pedido) => (
            <CTableRow key={pedido.id} active={selecionadoId === pedido.id} onClick={() => selecionarLinha(pedido.id)}>
              <CTableDataCell>{pedido.nomeCliente}</CTableDataCell>
              <CTableDataCell>{pedido.telefoneCliente || '-'}</CTableDataCell>
              <CTableDataCell>{formatarDataHora(pedido.dataPedido)}</CTableDataCell>
              <CTableDataCell>
                <CBadge color={SITUACOES[pedido.situacao]?.cor || 'secondary'}>
                  {SITUACOES[pedido.situacao]?.label || pedido.situacao}
                </CBadge>
              </CTableDataCell>
              <CTableDataCell>{formatarMoeda(pedido.valorTotal)}</CTableDataCell>
              <CTableDataCell>{pedido.dataPrevistaEntrega || '-'}</CTableDataCell>
            </CTableRow>
          ))}
          {pedidos.length === 0 && (
            <CTableRow>
              <CTableDataCell colSpan={6} className="text-body-secondary">
                Nenhum pedido cadastrado.
              </CTableDataCell>
            </CTableRow>
          )}
        </CTableBody>
      </CTable>
    </div>
  );
}
