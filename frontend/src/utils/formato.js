export function formatarMoeda(valor) {
  return valor != null ? `R$ ${Number(valor).toFixed(2)}` : '-';
}
