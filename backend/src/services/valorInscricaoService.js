const { fn, col, where } = require('sequelize');
const { Faixa } = require('../models');

const TIPO_EXAME_DE_FAIXA_ID = 1;

// Regra de valor (item 2 do módulo): tipo não cobrável -> sem valor; tipo cobrável comum -> valor do evento;
// Exame de Faixa -> valor vem do cadastro de faixa (com/sem carteirinha), nunca do campo valor do evento.
async function calcularValorInscricao({ evento, tipoEvento, candidato }) {
  if (!tipoEvento.cobravel) {
    return { valor: null, statusPagamento: 'pago' };
  }

  if (tipoEvento.id !== TIPO_EXAME_DE_FAIXA_ID) {
    const valor = evento.valor;
    return { valor, statusPagamento: valor && Number(valor) > 0 ? 'pendente' : 'pago' };
  }

  if (!candidato.faixa) {
    return {
      valor: null,
      statusPagamento: 'pendente',
      aviso:
        'Não foi possível identificar sua faixa automaticamente (cadastro sem essa informação). ' +
        'Sua inscrição foi registrada e nossa equipe entrará em contato para confirmar o valor do exame.',
    };
  }

  const faixaCadastrada = await Faixa.findOne({
    where: where(fn('LOWER', col('nome')), candidato.faixa.trim().toLowerCase()),
  });

  if (!faixaCadastrada) {
    return {
      valor: null,
      statusPagamento: 'pendente',
      aviso: `Faixa "${candidato.faixa}" não encontrada no cadastro. Nossa equipe entrará em contato para confirmar o valor do exame.`,
    };
  }

  const temCarteirinha = Boolean(candidato.numeroCarteirinha);
  const valor = temCarteirinha ? faixaCadastrada.valorComCarteirinha : faixaCadastrada.valorSemCarteirinha;

  return { valor, statusPagamento: valor && Number(valor) > 0 ? 'pendente' : 'pago' };
}

module.exports = { calcularValorInscricao, TIPO_EXAME_DE_FAIXA_ID };
