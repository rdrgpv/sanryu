const { Op } = require('sequelize');
const { Cor, ProdutoVariacao } = require('../models');

async function listar(req, res) {
  const where = {};
  if (req.query.ativo !== undefined) where.ativo = req.query.ativo === 'true';

  const cores = await Cor.findAll({ where, order: [['descricao', 'ASC']] });
  res.json(cores);
}

async function buscarPorId(req, res) {
  const cor = await Cor.findByPk(req.params.id);

  if (!cor) {
    return res.status(404).json({ error: 'Cor não encontrada.' });
  }

  res.json(cor);
}

async function verificarDescricaoDuplicada(descricao, idAtual) {
  const where = { descricao: (descricao || '').trim(), ativo: true };
  if (idAtual) where.id = { [Op.ne]: idAtual };
  return Cor.findOne({ where });
}

async function criar(req, res) {
  try {
    if (await verificarDescricaoDuplicada(req.body.descricao)) {
      return res.status(400).json({ error: 'Já existe uma cor ativa com esta descrição.' });
    }

    const cor = await Cor.create(req.body);
    res.status(201).json(cor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function atualizar(req, res) {
  const cor = await Cor.findByPk(req.params.id);

  if (!cor) {
    return res.status(404).json({ error: 'Cor não encontrada.' });
  }

  try {
    if (await verificarDescricaoDuplicada(req.body.descricao ?? cor.descricao, cor.id)) {
      return res.status(400).json({ error: 'Já existe uma cor ativa com esta descrição.' });
    }

    await cor.update(req.body);
    res.json(cor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remover(req, res) {
  const cor = await Cor.findByPk(req.params.id);

  if (!cor) {
    return res.status(404).json({ error: 'Cor não encontrada.' });
  }

  const totalVariacoes = await ProdutoVariacao.count({ where: { corId: cor.id } });
  if (totalVariacoes > 0) {
    return res.status(400).json({ error: 'Existem variações de produto usando esta cor. Inative-a em vez de excluir.' });
  }

  await cor.destroy();
  res.status(204).send();
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
