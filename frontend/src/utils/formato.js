export function formatarMoeda(valor) {
  return valor != null ? `R$ ${Number(valor).toFixed(2)}` : '-';
}

// Datas/horas aqui são timestamps completos (não datas "puras" tipo aniversário), então
// new Date(iso) é seguro — só formata sem os segundos, que toLocaleString('pt-BR') sem opções
// sempre inclui (ex.: "28/08/2026, 19:00:00" em vez de "28/08/2026 19:00").
export function formatarDataHora(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Máscara progressiva de telefone brasileiro conforme o usuário digita — (XX) XXXX-XXXX pra fixo
// (até 10 dígitos) e (XX) XXXXX-XXXX pra celular (11 dígitos). Aceita colar um número já formatado
// ou só dígitos, sempre normalizando a partir dos dígitos puros.
export function formatarTelefone(valor) {
  const digitos = (valor || '').replace(/\D/g, '').slice(0, 11);
  if (!digitos) return '';
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}
