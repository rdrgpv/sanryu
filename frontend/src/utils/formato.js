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

// Máscara progressiva de CPF (000.000.000-00) a partir dos dígitos digitados ou colados.
export function formatarCpf(valor) {
  const digitos = (valor || '').replace(/\D/g, '').slice(0, 11);
  return digitos
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

// Confere os dois dígitos verificadores — pega CPF digitado errado antes de salvar.
export function cpfValido(valor) {
  const digitos = (valor || '').replace(/\D/g, '');
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false;

  const verificador = (tamanho) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i += 1) soma += Number(digitos[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return verificador(9) === Number(digitos[9]) && verificador(10) === Number(digitos[10]);
}

export function formatarCep(valor) {
  const digitos = (valor || '').replace(/\D/g, '').slice(0, 8);
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
}

// Idade em anos a partir de "YYYY-MM-DD" — lê a string direto em vez de new Date(string), que
// interpreta como meia-noite UTC e "volta" um dia no fuso do Brasil.
export function calcularIdade(dataNascimento) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dataNascimento || '');
  if (!match) return null;

  const [, ano, mes, dia] = match.map(Number);
  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  if (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)) idade -= 1;
  return idade;
}
