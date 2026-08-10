const { Configuracao } = require('../models');

async function listar(req, res) {
  const configuracoes = await Configuracao.findAll({ order: [['sistema', 'ASC'], ['parametro', 'ASC']] });
  res.json(configuracoes);
}

async function buscarPorId(req, res) {
  const configuracao = await Configuracao.findByPk(req.params.id);

  if (!configuracao) {
    return res.status(404).json({ error: 'Configuração não encontrada.' });
  }

  res.json(configuracao);
}

async function criar(req, res) {
  try {
    const configuracao = await Configuracao.create(req.body);
    res.status(201).json(configuracao);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function atualizar(req, res) {
  const configuracao = await Configuracao.findByPk(req.params.id);

  if (!configuracao) {
    return res.status(404).json({ error: 'Configuração não encontrada.' });
  }

  try {
    await configuracao.update(req.body);
    res.json(configuracao);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remover(req, res) {
  const configuracao = await Configuracao.findByPk(req.params.id);

  if (!configuracao) {
    return res.status(404).json({ error: 'Configuração não encontrada.' });
  }

  await configuracao.destroy();
  res.status(204).send();
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
