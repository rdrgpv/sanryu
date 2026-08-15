const { Produto, ProdutoVariacao } = require('../models');

async function listar(req, res) {
  const where = {};
  if (req.query.ativo !== undefined) where.ativo = req.query.ativo === 'true';

  const produtos = await Produto.findAll({ where, order: [['descricao', 'ASC']] });
  res.json(produtos);
}

async function buscarPorId(req, res) {
  const produto = await Produto.findByPk(req.params.id);

  if (!produto) {
    return res.status(404).json({ error: 'Produto não encontrado.' });
  }

  res.json(produto);
}

async function criar(req, res) {
  try {
    const produto = await Produto.create(req.body);
    res.status(201).json(produto);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function atualizar(req, res) {
  const produto = await Produto.findByPk(req.params.id);

  if (!produto) {
    return res.status(404).json({ error: 'Produto não encontrado.' });
  }

  try {
    await produto.update(req.body);
    res.json(produto);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remover(req, res) {
  const produto = await Produto.findByPk(req.params.id);

  if (!produto) {
    return res.status(404).json({ error: 'Produto não encontrado.' });
  }

  const totalVariacoes = await ProdutoVariacao.count({ where: { produtoId: produto.id } });
  if (totalVariacoes > 0) {
    return res.status(400).json({ error: 'Existem variações cadastradas para este produto. Inative-o em vez de excluir.' });
  }

  await produto.destroy();
  res.status(204).send();
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
