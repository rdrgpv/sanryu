// Valor em reais por extenso (recibo): 1234.5 -> "mil duzentos e trinta e quatro reais e cinquenta centavos".
const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function ate999(numero) {
  if (numero === 0) return '';
  if (numero === 100) return 'cem';
  const partes = [];
  const centena = Math.floor(numero / 100);
  const resto = numero % 100;
  if (centena) partes.push(CENTENAS[centena]);
  if (resto < 20) {
    if (resto) partes.push(UNIDADES[resto]);
  } else {
    partes.push(DEZENAS[Math.floor(resto / 10)] + (resto % 10 ? ` e ${UNIDADES[resto % 10]}` : ''));
  }
  return partes.join(' e ');
}

function inteiroPorExtenso(numero) {
  if (numero === 0) return 'zero';
  const milhoes = Math.floor(numero / 1e6);
  const milhares = Math.floor((numero % 1e6) / 1000);
  const resto = numero % 1000;
  const grupos = [];

  if (milhoes) grupos.push(milhoes === 1 ? 'um milhão' : `${ate999(milhoes)} milhões`);
  if (milhares) grupos.push(milhares === 1 ? 'mil' : `${ate999(milhares)} mil`);
  if (resto) grupos.push(ate999(resto));

  // "e" antes do último grupo quando ele é "redondo" ou menor que 100 (mil e cem, mil e vinte).
  if (grupos.length > 1 && resto && (resto < 100 || resto % 100 === 0)) {
    const ultimo = grupos.pop();
    return `${grupos.join(' ')} e ${ultimo}`;
  }
  return grupos.join(' ');
}

function valorPorExtenso(valor) {
  const centavosTotais = Math.round(Number(valor) * 100);
  const reais = Math.floor(centavosTotais / 100);
  const centavos = centavosTotais % 100;
  const partes = [];

  if (reais) {
    const deReais = reais % 1e6 === 0 ? ' de reais' : ' reais';
    partes.push(`${inteiroPorExtenso(reais)}${reais === 1 ? ' real' : deReais}`);
  }
  if (centavos) partes.push(`${inteiroPorExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`);

  return partes.length ? partes.join(' e ') : 'zero real';
}

module.exports = { valorPorExtenso };
