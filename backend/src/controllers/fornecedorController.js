const { Fornecedor, PedidoCompra } = require('../models');

async function listar(req, res) {
  const where = {};
  if (req.query.ativo !== undefined) where.ativo = req.query.ativo === 'true';

  const fornecedores = await Fornecedor.findAll({ where, order: [['nome', 'ASC']] });
  res.json(fornecedores);
}

async function buscarPorId(req, res) {
  const fornecedor = await Fornecedor.findByPk(req.params.id);

  if (!fornecedor) {
    return res.status(404).json({ error: 'Fornecedor não encontrado.' });
  }

  res.json(fornecedor);
}

async function criar(req, res) {
  try {
    const fornecedor = await Fornecedor.create(req.body);
    res.status(201).json(fornecedor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function atualizar(req, res) {
  const fornecedor = await Fornecedor.findByPk(req.params.id);

  if (!fornecedor) {
    return res.status(404).json({ error: 'Fornecedor não encontrado.' });
  }

  try {
    await fornecedor.update(req.body);
    res.json(fornecedor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remover(req, res) {
  const fornecedor = await Fornecedor.findByPk(req.params.id);

  if (!fornecedor) {
    return res.status(404).json({ error: 'Fornecedor não encontrado.' });
  }

  const totalPedidosCompra = await PedidoCompra.count({ where: { fornecedorId: fornecedor.id } });
  if (totalPedidosCompra > 0) {
    return res.status(400).json({ error: 'Existem pedidos de compra associados a este fornecedor. Inative-o em vez de excluir.' });
  }

  await fornecedor.destroy();
  res.status(204).send();
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
