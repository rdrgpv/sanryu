import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CButton, CBadge } from '@coreui/react';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';
import { formatarMoeda, formatarDataHora } from '../../utils/formato.js';

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

      <AdminDataTable
        rows={pedidosCompra}
        selectedId={selecionadoId}
        onSelectRow={selecionarLinha}
        emptyMessage="Nenhum pedido de compra gerado."
        columns={[
          {
            key: 'fornecedor',
            label: 'Fornecedor',
            sortable: true,
            sortValue: (pc) => pc.fornecedor?.nome || '',
            render: (pc) => pc.fornecedor?.nome || '-',
          },
          { key: 'dataPedido', label: 'Data', sortable: true, render: (pc) => formatarDataHora(pc.dataPedido) },
          {
            key: 'situacao',
            label: 'Situação',
            sortable: true,
            sortValue: (pc) => SITUACOES[pc.situacao]?.label || pc.situacao,
            render: (pc) => (
              <CBadge color={SITUACOES[pc.situacao]?.cor || 'secondary'}>
                {SITUACOES[pc.situacao]?.label || pc.situacao}
              </CBadge>
            ),
          },
          { key: 'valorTotal', label: 'Total', align: 'end', sortable: true, render: (pc) => formatarMoeda(pc.valorTotal) },
          {
            key: 'dataPrevistaEntrega',
            label: 'Previsão de entrega',
            sortable: true,
            render: (pc) => pc.dataPrevistaEntrega || '-',
          },
          {
            key: 'dataRecebimento',
            label: 'Recebimento',
            sortable: true,
            render: (pc) => (pc.dataRecebimento ? new Date(pc.dataRecebimento).toLocaleDateString('pt-BR') : '-'),
          },
        ]}
      />
    </div>
  );
}
