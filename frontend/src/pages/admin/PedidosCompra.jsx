import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CButton,
  CBadge,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilTruck, cilCash, cilSend, cilDescription, cilLayers } from '@coreui/icons';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';
import ItensDoPedido, { resumoDosItens } from '../../admin/components/ItensDoPedido.jsx';
import { formatarMoeda, formatarDataHora } from '../../utils/formato.js';
import { formatarData, hoje } from '../../utils/financeiro.js';

const SITUACOES = {
  P: { label: 'Pendente', cor: 'secondary' },
  X: { label: 'Encomendado', cor: 'info' },
  PG: { label: 'Pago', cor: 'warning' },
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

// Mesma regra do backend (pagamentoCompraService.podeAgrupar).
function podeAgrupar(pedido) {
  return pedido.situacao !== 'E' && !pedido.dataPagamento && !pedido.pagamentoCompraId && Number(pedido.valorTotal) > 0;
}

export default function PedidosCompra() {
  const navigate = useNavigate();
  const [pedidosCompra, setPedidosCompra] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [pagamentos, setPagamentos] = useState([]);
  const [agrupando, setAgrupando] = useState(null);
  const [erroAgrupar, setErroAgrupar] = useState(null);

  async function carregarPagamentos() {
    const res = await api.get('/admin/pagamentos-compra');
    setPagamentos(res.data);
  }

  useEffect(() => {
    carregarPagamentos();
  }, []);

  // Abre o agrupamento com o fornecedor do pedido selecionado (ou o primeiro que tiver pedidos a pagar).
  function abrirAgrupar() {
    const candidatos = pedidosCompra.filter(podeAgrupar);
    const fornecedorId = (selecionado && podeAgrupar(selecionado) ? selecionado : candidatos[0])?.fornecedorId;
    setErroAgrupar(null);
    setAgrupando({
      fornecedorId: fornecedorId || '',
      ids: selecionado && podeAgrupar(selecionado) ? [selecionado.id] : [],
      vencimento: hoje(),
      observacao: '',
    });
  }

  function marcarParaAgrupar(id, marcado) {
    setAgrupando((prev) => ({ ...prev, ids: marcado ? [...prev.ids, id] : prev.ids.filter((item) => item !== id) }));
  }

  async function confirmarAgrupar() {
    setErroAgrupar(null);
    try {
      await api.post('/admin/pagamentos-compra', { pedidoCompraIds: agrupando.ids, vencimento: agrupando.vencimento, observacao: agrupando.observacao });
      setAgrupando(null);
      carregarPedidosCompra();
      carregarPagamentos();
    } catch (err) {
      setErroAgrupar(err.response?.data?.error || 'Não foi possível agrupar.');
    }
  }

  async function desfazerAgrupamento(pagamento) {
    if (!window.confirm(`Desfazer o pagamento agrupado #${pagamento.id}? Cada pedido volta a ter a própria conta a pagar.`)) return;
    try {
      await api.delete(`/admin/pagamentos-compra/${pagamento.id}`);
      carregarPedidosCompra();
      carregarPagamentos();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível desfazer.');
    }
  }

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

  async function handleMarcarPago() {
    if (!selecionado) return;
    if (!window.confirm('Marcar este pedido de compra como pago?')) return;
    try {
      await api.post(`/admin/pedidos-compra/${selecionado.id}/marcar-pago`);
      carregarPedidosCompra();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível marcar como pago.');
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
        onAtualizar={() => {
          carregarPedidosCompra();
          carregarPagamentos();
        }}
        extra={
          <>
            <CButton
              color="secondary"
              variant="outline"
              disabled={!selecionado}
              onClick={() => navigate(`/admin/pedidos-compra/${selecionadoId}/visualizar`)}
              title="Visualizar / imprimir o pedido"
            >
              <CIcon icon={cilDescription} />
            </CButton>
            <CButton
              color="secondary"
              variant="outline"
              disabled={selecionado?.situacao !== 'P'}
              onClick={handleMarcarEncomendado}
              title="Marcar como encomendado"
            >
              <CIcon icon={cilTruck} />
            </CButton>
            <CButton
              color="secondary"
              variant="outline"
              disabled={selecionado?.situacao !== 'X' || !!selecionado?.pagamentoCompraId}
              onClick={handleMarcarPago}
              title="Marcar como pago"
            >
              <CIcon icon={cilCash} />
            </CButton>
            <CButton
              color="secondary"
              variant="outline"
              disabled={!selecionado || !['P', 'X'].includes(selecionado.situacao)}
              onClick={handleEnviarWhatsApp}
              title="Enviar por WhatsApp"
            >
              <CIcon icon={cilSend} />
            </CButton>
            <CButton
              color="secondary"
              variant="outline"
              disabled={pedidosCompra.filter(podeAgrupar).length < 2}
              onClick={abrirAgrupar}
              title="Agrupar pedidos do mesmo fornecedor num único pagamento"
            >
              <CIcon icon={cilLayers} className="me-1" />
              Agrupar pagamento
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
        renderDetail={(pc) => (
          <>
            <ItensDoPedido itens={pc.itens} tipo="compra" />
            {pc.observacao && <div className="small text-body-secondary mt-1">Obs.: {pc.observacao}</div>}
          </>
        )}
        columns={[
          { key: 'id', label: 'Nº', sortable: true, render: (pc) => `#${pc.id}` },
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
            render: (pc) => formatarData(pc.dataPrevistaEntrega),
          },
          {
            key: 'dataPagamento',
            label: 'Pagamento',
            sortable: true,
            render: (pc) => (
              <>
                {pc.dataPagamento ? new Date(pc.dataPagamento).toLocaleDateString('pt-BR') : '-'}
                {pc.pagamentoCompraId && (
                  <CBadge color="light" textColor="dark" className="ms-1 border" title="Faz parte de um pagamento agrupado">
                    agrupado #{pc.pagamentoCompraId}
                  </CBadge>
                )}
              </>
            ),
          },
          {
            key: 'dataRecebimento',
            label: 'Recebimento',
            sortable: true,
            render: (pc) => (pc.dataRecebimento ? new Date(pc.dataRecebimento).toLocaleDateString('pt-BR') : '-'),
          },
        ]}
      />

      {pagamentos.length > 0 && (
        <>
          <h2 className="h5 mt-4">Pagamentos agrupados</h2>
          <p className="text-body-secondary small">
            Cada um vira uma única conta a pagar no financeiro. Dar a baixa lá marca todos os pedidos do grupo como pagos.
          </p>
          <AdminDataTable
            rows={pagamentos}
            emptyMessage="Nenhum pagamento agrupado."
            renderDetail={(pagamento) => (
              <>
                {pagamento.pedidos.map((pedido) => (
                  <div key={pedido.id} className="mb-2">
                    <div className="small fw-semibold">
                      Pedido de compra #{pedido.id} · {formatarDataHora(pedido.dataPedido)} · {formatarMoeda(pedido.valorTotal)}
                      {pedido.situacao === 'E' && <CBadge color="danger" className="ms-1">Cancelado</CBadge>}
                    </div>
                    <ItensDoPedido itens={pedido.itens} tipo="compra" />
                  </div>
                ))}
                {pagamento.observacao && <div className="small text-body-secondary">Obs.: {pagamento.observacao}</div>}
              </>
            )}
            columns={[
              { key: 'id', label: 'Nº', render: (pagamento) => `#${pagamento.id}` },
              { key: 'fornecedor', label: 'Fornecedor', render: (pagamento) => pagamento.fornecedor?.nome || '-' },
              {
                key: 'pedidos',
                label: 'Pedidos',
                render: (pagamento) =>
                  pagamento.pedidos
                    .map((pedido) => `#${pedido.id}${pedido.situacao === 'E' ? ' (cancelado)' : ''}`)
                    .join(', '),
              },
              { key: 'vencimento', label: 'Vencimento', render: (pagamento) => formatarData(pagamento.lancamento?.vencimento || pagamento.vencimento) },
              { key: 'valor', label: 'Valor', align: 'end', render: (pagamento) => formatarMoeda(pagamento.lancamento?.valor || 0) },
              {
                key: 'status',
                label: 'Situação',
                render: (pagamento) => {
                  const status = pagamento.lancamento?.status;
                  if (status === 'pago') return <CBadge color="success">Pago</CBadge>;
                  if (status === 'cancelado') return <CBadge color="secondary">Cancelado</CBadge>;
                  return <CBadge color="warning">A pagar</CBadge>;
                },
              },
              {
                key: 'acoes',
                label: '',
                render: (pagamento) =>
                  pagamento.lancamento?.status === 'pago' ? null : (
                    <CButton size="sm" color="danger" variant="outline" onClick={() => desfazerAgrupamento(pagamento)}>
                      Desfazer
                    </CButton>
                  ),
              },
            ]}
          />
        </>
      )}

      <CModal visible={!!agrupando} onClose={() => setAgrupando(null)} size="lg">
        <CModalHeader>
          <CModalTitle>Agrupar pagamento</CModalTitle>
        </CModalHeader>
        {agrupando && (
          <CModalBody>
            <p className="small text-body-secondary">
              Junte pedidos do mesmo fornecedor ainda não pagos numa única conta a pagar (um boleto ou Pix só).
            </p>
            <CFormLabel>Fornecedor</CFormLabel>
            <select
              className="form-select mb-3"
              value={agrupando.fornecedorId}
              onChange={(event) => setAgrupando((prev) => ({ ...prev, fornecedorId: Number(event.target.value), ids: [] }))}
            >
              {[...new Map(pedidosCompra.filter(podeAgrupar).map((pc) => [pc.fornecedorId, pc.fornecedor?.nome])).entries()].map(([fornecedorId, nome]) => (
                <option key={fornecedorId} value={fornecedorId}>
                  {nome}
                </option>
              ))}
            </select>

            {pedidosCompra
              .filter((pc) => podeAgrupar(pc) && pc.fornecedorId === Number(agrupando.fornecedorId))
              .map((pc) => (
                <div key={pc.id} className={`border rounded p-2 mb-2 ${agrupando.ids.includes(pc.id) ? 'border-secondary bg-body-tertiary' : ''}`}>
                  <CFormCheck
                    id={`agrupar-${pc.id}`}
                    checked={agrupando.ids.includes(pc.id)}
                    onChange={(event) => marcarParaAgrupar(pc.id, event.target.checked)}
                    label={
                      <span>
                        <strong>#{pc.id}</strong> — {formatarDataHora(pc.dataPedido)} — <strong>{formatarMoeda(pc.valorTotal)}</strong>
                      </span>
                    }
                  />
                  <details className="ms-4 mt-1">
                    <summary className="small text-body-secondary" title="Ver os itens">
                      {resumoDosItens(pc.itens) || 'Sem itens'}
                    </summary>
                    <div className="mt-2">
                      <ItensDoPedido itens={pc.itens} tipo="compra" />
                    </div>
                  </details>
                </div>
              ))}

            <div className="d-flex flex-wrap gap-3 mt-3 align-items-end">
              <div>
                <CFormLabel>Vencimento</CFormLabel>
                <CFormInput type="date" value={agrupando.vencimento} onChange={(event) => setAgrupando((prev) => ({ ...prev, vencimento: event.target.value }))} />
              </div>
              <div className="ms-auto text-end">
                <div className="small text-body-secondary">Total do pagamento</div>
                <strong className="fs-5">
                  {formatarMoeda(
                    pedidosCompra.filter((pc) => agrupando.ids.includes(pc.id)).reduce((soma, pc) => soma + Number(pc.valorTotal), 0)
                  )}
                </strong>
              </div>
            </div>
            <CFormLabel className="mt-3">Observação</CFormLabel>
            <CFormTextarea rows={2} value={agrupando.observacao} onChange={(event) => setAgrupando((prev) => ({ ...prev, observacao: event.target.value }))} />
            {erroAgrupar && <div className="alert alert-danger mt-3 mb-0">{erroAgrupar}</div>}
          </CModalBody>
        )}
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setAgrupando(null)}>
            Cancelar
          </CButton>
          <CButton color="primary" disabled={!agrupando || agrupando.ids.length < 2} onClick={confirmarAgrupar}>
            Agrupar {agrupando?.ids.length || 0} {agrupando?.ids.length === 1 ? 'pedido' : 'pedidos'}
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  );
}
