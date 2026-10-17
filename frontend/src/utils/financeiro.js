export const FORMAS_PAGAMENTO = [
  { valor: 'pix', label: 'Pix' },
  { valor: 'dinheiro', label: 'Dinheiro' },
  { valor: 'cartao', label: 'Cartão' },
  { valor: 'transferencia', label: 'Transferência' },
  { valor: 'boleto', label: 'Boleto' },
  { valor: 'debito_automatico', label: 'Débito automático' },
  { valor: 'outro', label: 'Outro' },
];

export const TIPOS_CONTA = [
  { valor: 'caixa', label: 'Caixa (dinheiro)' },
  { valor: 'banco', label: 'Banco' },
  { valor: 'mercadopago', label: 'Mercado Pago' },
  { valor: 'outro', label: 'Outro' },
];

export const ORIGENS = {
  manual: 'Manual',
  mensalidade: 'Mensalidade',
  pedido: 'Venda da loja',
  pedidoCompra: 'Pedido de compra',
  recorrencia: 'Recorrente',
};

export function labelForma(valor) {
  return FORMAS_PAGAMENTO.find((forma) => forma.valor === valor)?.label || valor || '-';
}

export function formatarData(valor) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor || '');
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '-';
}

export function formatarMes(valor) {
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const [ano, mes] = (valor || '').split('-').map(Number);
  return mes ? `${nomes[mes - 1]}/${ano}` : valor;
}

export function hoje() {
  return new Date().toLocaleDateString('sv-SE');
}
