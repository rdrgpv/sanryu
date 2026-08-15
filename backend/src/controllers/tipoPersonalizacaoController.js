const { Op } = require('sequelize');
const { TipoPersonalizacao } = require('../models');

async function listar(req, res) {
  const where = {};
  if (req.query.ativo !== undefined) where.ativo = req.query.ativo === 'true';

  const tipos = await TipoPersonalizacao.findAll({ where, order: [['descricao', 'ASC']] });
  res.json(tipos);
}

async function buscarPorId(req, res) {
  const tipo = await TipoPersonalizacao.findByPk(req.params.id);

  if (!tipo) {
    return res.status(404).json({ error: 'Tipo de personalização não encontrado.' });
  }

  res.json(tipo);
}

async function verificarDescricaoDuplicada(descricao, idAtual) {
  const where = { descricao: (descricao || '').trim(), ativo: true };
  if (idAtual) where.id = { [Op.ne]: idAtual };
  return TipoPersonalizacao.findOne({ where });
}

async function criar(req, res) {
  try {
    if (await verificarDescricaoDuplicada(req.body.descricao)) {
      return res.status(400).json({ error: 'Já existe um tipo de personalização ativo com esta descrição.' });
    }

    const tipo = await TipoPersonalizacao.create(req.body);
    res.status(201).json(tipo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function atualizar(req, res) {
  const tipo = await TipoPersonalizacao.findByPk(req.params.id);

  if (!tipo) {
    return res.status(404).json({ error: 'Tipo de personalização não encontrado.' });
  }

  try {
    if (await verificarDescricaoDuplicada(req.body.descricao ?? tipo.descricao, tipo.id)) {
      return res.status(400).json({ error: 'Já existe um tipo de personalização ativo com esta descrição.' });
    }

    await tipo.update(req.body);
    res.json(tipo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remover(req, res) {
  const tipo = await TipoPersonalizacao.findByPk(req.params.id);

  if (!tipo) {
    return res.status(404).json({ error: 'Tipo de personalização não encontrado.' });
  }

  // Nada referencia TipoPersonalizacao ainda nesta fase (PedidoItemPersonalizacao vem na Fase 2,
  // quando este remover passa a checar isso também).
  await tipo.destroy();
  res.status(204).send();
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
