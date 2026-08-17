export function formatarMoeda(valor) {
  return valor != null ? `R$ ${Number(valor).toFixed(2)}` : '-';
}

// Datas/horas aqui são timestamps completos (não datas "puras" tipo aniversário), então
// new Date(iso) é seguro. Monta a string na mão em vez de usar toLocaleString('pt-BR', {...}):
// o Intl da própria engine sempre insere uma vírgula entre data e hora nesse tipo de formatação
// combinada (varia entre navegador/Node, mas não dá pra tirar só com opções), então construir na
// mão garante "28/08/2026 19:00" sem vírgula e sem segundos, sempre.
export function formatarDataHora(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const hora = String(d.getHours()).padStart(2, '0');
  const minuto = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${d.getFullYear()} ${hora}:${minuto}`;
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
