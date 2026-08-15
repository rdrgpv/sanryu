export function formatarMoeda(valor) {
  return valor != null ? `R$ ${Number(valor).toFixed(2)}` : '-';
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
