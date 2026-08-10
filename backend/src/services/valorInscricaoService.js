const { fn, col, where } = require('sequelize');
const { Faixa } = require('../models');

const TIPO_EXAME_DE_FAIXA_ID = 1;
const OPCOES_FAIXA_BRANCA = ['Cinza', 'Amarela'];

function calcularPagamento(valor) {
  return valor && Number(valor) > 0 ? 'pendente' : 'pago';
}

async function buscarFaixaPorNome(nome) {
  return Faixa.findOne({ where: where(fn('LOWER', col('nome')), nome.trim().toLowerCase()) });
}

// Regra de valor (item 2 do módulo): tipo não cobrável -> sem valor; tipo cobrável comum -> valor do evento;
// Exame de Faixa -> valor vem do cadastro de faixa (com/sem carteirinha), nunca do campo valor do evento.
// Só a origem "gatame" traz faixa confiável; sem ela (ou origem "morganti"), assume-se Branca — e, sendo
// Branca, a pessoa precisa escolher para qual faixa vai fazer o exame (Cinza ou Amarela).
async function calcularValorInscricao({ evento, tipoEvento, candidato, faixaEscolhida }) {
  if (!tipoEvento.cobravel) {
    return { valor: null, statusPagamento: 'pago', faixaUsada: null };
  }

  if (tipoEvento.id !== TIPO_EXAME_DE_FAIXA_ID) {
    const valor = evento.valor;
    return { valor, statusPagamento: calcularPagamento(valor), faixaUsada: null };
  }

  const origemConfiavel = candidato.origem === 'gatame';
  const faixaEfetiva = origemConfiavel && candidato.faixa ? candidato.faixa : 'Branca';

  let nomeFaixaParaValor = faixaEfetiva;

  if (faixaEfetiva.trim().toLowerCase() === 'branca') {
    const escolhaValida = OPCOES_FAIXA_BRANCA.find(
      (opcao) => opcao.toLowerCase() === (faixaEscolhida || '').trim().toLowerCase()
    );

    if (!escolhaValida) {
      return {
        erroValidacao: 'Selecione para qual faixa você vai fazer o exame.',
        opcoesFaixa: OPCOES_FAIXA_BRANCA,
      };
    }

    nomeFaixaParaValor = escolhaValida;
  }

  const faixaCadastrada = await buscarFaixaPorNome(nomeFaixaParaValor);

  if (!faixaCadastrada) {
    return {
      valor: null,
      statusPagamento: 'pendente',
      faixaUsada: nomeFaixaParaValor,
      aviso: `Faixa "${nomeFaixaParaValor}" não encontrada no cadastro. Nossa equipe entrará em contato para confirmar o valor do exame.`,
    };
  }

  const temCarteirinha = Boolean(candidato.numeroCarteirinha);
  const valor = temCarteirinha ? faixaCadastrada.valorComCarteirinha : faixaCadastrada.valorSemCarteirinha;

  return { valor, statusPagamento: calcularPagamento(valor), faixaUsada: nomeFaixaParaValor };
}

module.exports = { calcularValorInscricao, TIPO_EXAME_DE_FAIXA_ID, OPCOES_FAIXA_BRANCA };
