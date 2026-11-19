import { formatarData, labelForma } from './financeiro.js';
import { descricaoDoItem } from '../admin/components/ItensDoPedido.jsx';

// Mensagens pro fornecedor pelo WhatsApp: pedido de compra e pagamento agrupado. Formato enxuto:
// título, a data (pagamento, vencimento ou previsão), os itens em sequência e o total. Só a
// descrição dos itens — o código e o número do pedido são internos, não dizem nada ao fornecedor.

// Valor em reais no texto (formatarMoeda pode sair com ponto decimal).
function reais(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function titulo(pago, emissor, semPagamento = 'Pedido de compra') {
  return `*${pago ? 'Comprovante de pagamento' : semPagamento} — ${emissor?.reciboNome || 'San·Ryu Dojo'}*`;
}

function linhasDosItens(itens = []) {
  return itens.map((item) => `• ${item.quantidade}× ${descricaoDoItem(item)} — ${reais(item.valorTotal)}`);
}

function montar(cabecalho, data, itens, total, observacao) {
  const linhas = [cabecalho, ''];
  if (data) linhas.push(data, '');
  linhas.push(...linhasDosItens(itens), '', `*Total: ${reais(total)}*`);
  if (observacao) linhas.push('', observacao);
  return linhas.join('\n');
}

export function linkWhatsapp(telefone, texto) {
  let numero = String(telefone || '').replace(/\D/g, '');
  if (numero && numero.length <= 11) numero = `55${numero}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

// Um pedido de compra: vira "comprovante" quando já foi pago.
export function textoPedidoCompra(pedido, emissor) {
  const pago = Boolean(pedido.dataPagamento);
  const data = pago
    ? `Pago em ${new Date(pedido.dataPagamento).toLocaleDateString('pt-BR')}`
    : pedido.dataPrevistaEntrega
      ? `Previsão de entrega: ${formatarData(pedido.dataPrevistaEntrega)}`
      : null;
  return montar(titulo(pago, emissor), data, pedido.itens, pedido.valorTotal, pedido.observacao);
}

// Pagamento agrupado: os itens de todos os pedidos do grupo numa lista só (cancelados ficam de fora).
export function textoPagamentoCompra(pagamento, emissor) {
  const pago = pagamento.lancamento?.status === 'pago';
  const itens = pagamento.pedidos.filter((pedido) => pedido.situacao !== 'E').flatMap((pedido) => pedido.itens || []);
  const forma = pagamento.lancamento?.formaPagamento ? ` (${labelForma(pagamento.lancamento.formaPagamento)})` : '';
  const data = pago
    ? `Pago em ${formatarData(pagamento.lancamento.dataPagamento)}${forma}`
    : `Vencimento: ${formatarData(pagamento.lancamento?.vencimento || pagamento.vencimento)}`;
  const total = pago ? pagamento.lancamento.valorPago ?? pagamento.lancamento.valor : pagamento.lancamento?.valor;
  return montar(titulo(pago, emissor, 'Pagamento'), data, itens, total, pagamento.observacao);
}
