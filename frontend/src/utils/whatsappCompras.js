import { formatarData, labelForma } from './financeiro.js';
import { descricaoDoItem } from '../admin/components/ItensDoPedido.jsx';

// Mensagens pro fornecedor pelo WhatsApp: pedido de compra (o que estamos pedindo/pagando) e
// pagamento agrupado. Só a descrição dos itens — o código é interno, não diz nada ao fornecedor.

// Valor em reais no texto (formatarMoeda pode sair com ponto decimal).
function reais(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function nomeDoDojo(emissor) {
  return emissor?.reciboNome || 'San·Ryu Dojo';
}

function linhasDosItens(itens = []) {
  return itens.map((item) => `• ${item.quantidade}× ${descricaoDoItem(item)} — ${reais(item.valorTotal)}`);
}

export function linkWhatsapp(telefone, texto) {
  let numero = String(telefone || '').replace(/\D/g, '');
  if (numero && numero.length <= 11) numero = `55${numero}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

// Um pedido de compra: vira "comprovante" quando já foi pago.
export function textoPedidoCompra(pedido, emissor) {
  const pago = Boolean(pedido.dataPagamento);
  const linhas = [
    `*${pago ? 'Comprovante de pagamento' : 'Pedido de compra'} — ${nomeDoDojo(emissor)}*`,
    `Pedido #${pedido.id} (${new Date(pedido.dataPedido).toLocaleDateString('pt-BR')}) · ${pedido.fornecedor?.nome || ''}`,
  ];
  if (pago) linhas.push(`Pago em ${new Date(pedido.dataPagamento).toLocaleDateString('pt-BR')}`);
  else if (pedido.dataPrevistaEntrega) linhas.push(`Previsão de entrega: ${formatarData(pedido.dataPrevistaEntrega)}`);

  linhas.push('', ...linhasDosItens(pedido.itens), '', `*Total: ${reais(pedido.valorTotal)}*`);
  if (pedido.observacao) linhas.push('', pedido.observacao);
  return linhas.join('\n');
}

// Pagamento agrupado: o que está sendo pago, pedido a pedido, e o total.
export function textoPagamentoCompra(pagamento, emissor) {
  const ativos = pagamento.pedidos.filter((pedido) => pedido.situacao !== 'E');
  const pago = pagamento.lancamento?.status === 'pago';
  const linhas = [
    `*${pago ? 'Comprovante de pagamento' : 'Pagamento'} — ${nomeDoDojo(emissor)}*`,
    `Pagamento agrupado #${pagamento.id} · ${pagamento.fornecedor?.nome || ''}`,
    pago
      ? `Pago em ${formatarData(pagamento.lancamento.dataPagamento)}${pagamento.lancamento.formaPagamento ? ` (${labelForma(pagamento.lancamento.formaPagamento)})` : ''}`
      : `Vencimento: ${formatarData(pagamento.lancamento?.vencimento || pagamento.vencimento)}`,
    '',
  ];

  ativos.forEach((pedido) => {
    linhas.push(`*Pedido #${pedido.id}* (${new Date(pedido.dataPedido).toLocaleDateString('pt-BR')}) — ${reais(pedido.valorTotal)}`);
    linhas.push(...linhasDosItens(pedido.itens), '');
  });

  linhas.push(`*Total: ${reais(pago ? pagamento.lancamento.valorPago ?? pagamento.lancamento.valor : pagamento.lancamento?.valor)}*`);
  if (pagamento.observacao) linhas.push('', pagamento.observacao);
  return linhas.join('\n');
}
