// CSV no formato que o Excel brasileiro abre direto: BOM UTF-8 (acentos), separador ";" e vírgula
// decimal. Campos com ; aspas ou quebra de linha vão entre aspas.
const BOM = '﻿';

function celula(valor) {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor);
  return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function numero(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  return Number(valor).toFixed(2).replace('.', ',');
}

// "YYYY-MM-DD" (ou Date/ISO) -> "DD/MM/AAAA".
function data(valor) {
  if (!valor) return '';
  const texto = valor instanceof Date ? valor.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }) : String(valor);
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : texto;
}

// colunas: [{ titulo, valor: (linha) => ..., tipo?: 'numero' | 'data' }]
function gerarCsv(colunas, linhas) {
  const cabecalho = colunas.map((coluna) => celula(coluna.titulo)).join(';');
  const corpo = linhas.map((linha) =>
    colunas
      .map((coluna) => {
        const valor = coluna.valor(linha);
        if (coluna.tipo === 'numero') return numero(valor);
        if (coluna.tipo === 'data') return data(valor);
        return celula(valor);
      })
      .join(';')
  );
  return BOM + [cabecalho, ...corpo].join('\r\n') + '\r\n';
}

module.exports = { gerarCsv };
