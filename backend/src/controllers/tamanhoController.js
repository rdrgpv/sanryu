const { Op } = require('sequelize');
const { Tamanho, ProdutoVariacao } = require('../models');

async function listar(req, res) {
  const where = {};
  if (req.query.ativo !== undefined) where.ativo = req.query.ativo === 'true';

  const tamanhos = await Tamanho.findAll({ where, order: [['ordem', 'ASC'], ['descricao', 'ASC']] });
  res.json(tamanhos);
}

async function buscarPorId(req, res) {
  const tamanho = await Tamanho.findByPk(req.params.id);

  if (!tamanho) {
    return res.status(404).json({ error: 'Tamanho não encontrado.' });
  }

  res.json(tamanho);
}

async function verificarDescricaoDuplicada(descricao, idAtual) {
  const where = { descricao: (descricao || '').trim(), ativo: true };
  if (idAtual) where.id = { [Op.ne]: idAtual };
  return Tamanho.findOne({ where });
}

async function criar(req, res) {
  try {
    if (await verificarDescricaoDuplicada(req.body.descricao)) {
      return res.status(400).json({ error: 'Já existe um tamanho ativo com esta descrição.' });
    }

    const tamanho = await Tamanho.create(req.body);
    res.status(201).json(tamanho);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function atualizar(req, res) {
  const tamanho = await Tamanho.findByPk(req.params.id);

  if (!tamanho) {
    return res.status(404).json({ error: 'Tamanho não encontrado.' });
  }

  try {
    if (await verificarDescricaoDuplicada(req.body.descricao ?? tamanho.descricao, tamanho.id)) {
      return res.status(400).json({ error: 'Já existe um tamanho ativo com esta descrição.' });
    }

    await tamanho.update(req.body);
    res.json(tamanho);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remover(req, res) {
  const tamanho = await Tamanho.findByPk(req.params.id);

  if (!tamanho) {
    return res.status(404).json({ error: 'Tamanho não encontrado.' });
  }

  const totalVariacoes = await ProdutoVariacao.count({ where: { tamanhoId: tamanho.id } });
  if (totalVariacoes > 0) {
    return res.status(400).json({ error: 'Existem variações de produto usando este tamanho. Inative-o em vez de excluir.' });
  }

  await tamanho.destroy();
  res.status(204).send();
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
