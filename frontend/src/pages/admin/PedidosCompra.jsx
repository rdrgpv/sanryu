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
import { formatarMoeda } from '../../utils/formato.js';

const SITUACOES = {
  P: { label: 'Pendente', cor: 'secondary' },
  X: { label: 'Encomendado', cor: 'info' },
  R: { label: 'Recebido', cor: 'success' },
  E: { label: 'Cancelado', cor: 'danger' },
};

function montarLinkWhatsApp(pedidoCompra) {
  const telefone = (pedidoCompra.fornecedor?.telefone || '').replace(/\D/g, '');
  const numero = telefone.length <= 11 ? `55${telefone}` : telefone;
  const itens = (pedidoCompra.itens || [])
    .map((item) => {
      const variacao = item.produtoVariacao;
      const descricao = [variacao?.produto?.descricao, variacao?.cor?.descricao, variacao?.tamanho?.descricao]
        .filter(Boolean)
        .join(' — ');
      return `- ${descricao} (${variacao?.codigo}): ${item.quantidade} un.`;
    })
    .join('\n');
  const texto = `Pedido de compra #${pedidoCompra.id}\nFornecedor: ${pedidoCompra.fornecedor?.nome}\n\nItens:\n${itens}\n\nValor total: ${formatarMoeda(pedidoCompra.valorTotal)}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

export default function PedidosCompra() {
  const navigate = useNavigate();
  const [pedidosCompra, setPedidosCompra] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);

  async function carregarPedidosCompra() {
    const res = await api.get('/admin/pedidos-compra');
    setPedidosCompra(res.data);
  }

  useEffect(() => {
    carregarPedidosCompra();
  }, []);

  const selecionado = pedidosCompra.find((p) => p.id === selecionadoId) || null;

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir este pedido de compra?')) return;
    try {
      await api.delete(`/admin/pedidos-compra/${selecionadoId}`);
      setSelecionadoId(null);
      carregarPedidosCompra();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível excluir o pedido de compra.');
    }
  }

  async function handleMarcarEncomendado() {
    if (!selecionado) return;
    if (!window.confirm('Marcar este pedido de compra como encomendado?')) return;
    try {
      await api.post(`/admin/pedidos-compra/${selecionado.id}/marcar-encomendado`);
      carregarPedidosCompra();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível marcar como encomendado.');
    }
  }

  async function handleEnviarWhatsApp() {
    if (!selecionado) return;
    const res = await api.get(`/admin/pedidos-compra/${selecionado.id}`);
    window.open(montarLinkWhatsApp(res.data), '_blank');
  }

  return (
    <div>
      <h1 className="h3 mb-3">Pedidos de Compra</h1>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        podeExcluir={selecionado?.situacao === 'P'}
        novoLabel="Novo"
        onNovo={() => navigate('/admin/pedidos')}
        onEditar={() => navigate(`/admin/pedidos-compra/${selecionadoId}`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarPedidosCompra}
        extra={
          <>
            <CButton color="secondary" variant="outline" disabled={selecionado?.situacao !== 'P'} onClick={handleMarcarEncomendado}>
              Marcar como encomendado
            </CButton>
            <CButton
              color="secondary"
              variant="outline"
              disabled={!selecionado || !['P', 'X'].includes(selecionado.situacao)}
              onClick={handleEnviarWhatsApp}
            >
              Enviar por WhatsApp
            </CButton>
          </>
        }
      />
      <p className="text-body-secondary small">
        Pedidos de compra não são criados diretamente — use "Gerar pedido de compra" a partir de um pedido de venda pendente.
      </p>

      <CTable hover responsive className="bg-white">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Fornecedor</CTableHeaderCell>
            <CTableHeaderCell>Data</CTableHeaderCell>
            <CTableHeaderCell>Situação</CTableHeaderCell>
            <CTableHeaderCell>Total</CTableHeaderCell>
            <CTableHeaderCell>Previsão de entrega</CTableHeaderCell>
            <CTableHeaderCell>Recebimento</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {pedidosCompra.map((pedidoCompra) => (
            <CTableRow
              key={pedidoCompra.id}
              active={selecionadoId === pedidoCompra.id}
              onClick={() => selecionarLinha(pedidoCompra.id)}
            >
              <CTableDataCell>{pedidoCompra.fornecedor?.nome || '-'}</CTableDataCell>
              <CTableDataCell>{new Date(pedidoCompra.dataPedido).toLocaleString('pt-BR')}</CTableDataCell>
              <CTableDataCell>
                <CBadge color={SITUACOES[pedidoCompra.situacao]?.cor || 'secondary'}>
                  {SITUACOES[pedidoCompra.situacao]?.label || pedidoCompra.situacao}
                </CBadge>
              </CTableDataCell>
              <CTableDataCell>{formatarMoeda(pedidoCompra.valorTotal)}</CTableDataCell>
              <CTableDataCell>{pedidoCompra.dataPrevistaEntrega || '-'}</CTableDataCell>
              <CTableDataCell>
                {pedidoCompra.dataRecebimento ? new Date(pedidoCompra.dataRecebimento).toLocaleDateString('pt-BR') : '-'}
              </CTableDataCell>
            </CTableRow>
          ))}
          {pedidosCompra.length === 0 && (
            <CTableRow>
              <CTableDataCell colSpan={6} className="text-body-secondary">
                Nenhum pedido de compra gerado.
              </CTableDataCell>
            </CTableRow>
          )}
        </CTableBody>
      </CTable>
    </div>
  );
}
