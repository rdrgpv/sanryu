const { Configuracao } = require('../models');

async function obterValor(parametro, sistema = 'SAN') {
  const config = await Configuracao.findOne({ where: { sistema, parametro } });
  return config ? config.valor : null;
}

module.exports = { obterValor };
