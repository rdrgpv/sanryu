const { PedidoCompra, PedidoCompraItem, ProdutoVariacao, Produto, Cor, Tamanho, Fornecedor } = require('../models');
const pedidoCompraService = require('../services/pedidoCompraService');

const INCLUDE_ITENS = {
  model: PedidoCompraItem,
  as: 'itens',
  include: [
    {
      model: ProdutoVariacao,
      as: 'produtoVariacao',
      include: [
        { model: Produto, as: 'produto' },
        { model: Cor, as: 'cor' },
        { model: Tamanho, as: 'tamanho' },
      ],
    },
  ],
};

async function listar(req, res) {
  const where = {};
  if (req.query.situacao) where.situacao = req.query.situacao;

  const pedidosCompra = await PedidoCompra.findAll({
    where,
    include: [{ model: Fornecedor, as: 'fornecedor' }],
    order: [['dataPedido', 'DESC']],
  });
  res.json(pedidosCompra);
}

async function buscarPorId(req, res) {
  const pedidoCompra = await PedidoCompra.findByPk(req.params.id, {
    include: [{ model: Fornecedor, as: 'fornecedor' }, INCLUDE_ITENS],
  });

  if (!pedidoCompra) {
    return res.status(404).json({ error: 'Pedido de compra não encontrado.' });
  }

  res.json(pedidoCompra);
}

// Itens e preços são gerados pelo sistema (gerarPedidoCompra) — só observação/previsão de entrega
// podem ser editadas à mão, fornecedor e itens ficam fixos desde a geração.
async function atualizar(req, res) {
  const pedidoCompra = await PedidoCompra.findByPk(req.params.id);

  if (!pedidoCompra) {
    return res.status(404).json({ error: 'Pedido de compra não encontrado.' });
  }

  try {
    await pedidoCompra.update({
      observacao: req.body.observacao ?? pedidoCompra.observacao,
      dataPrevistaEntrega: req.body.dataPrevistaEntrega ?? pedidoCompra.dataPrevistaEntrega,
    });
    res.json(pedidoCompra);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remover(req, res) {
  const pedidoCompra = await PedidoCompra.findByPk(req.params.id);

  if (!pedidoCompra) {
    return res.status(404).json({ error: 'Pedido de compra não encontrado.' });
  }

  if (pedidoCompra.situacao !== 'P') {
    return res.status(400).json({ error: 'Só é possível excluir pedidos de compra pendentes.' });
  }

  await pedidoCompra.destroy();
  res.status(204).send();
}

async function gerar(req, res) {
  try {
    const pedidoCompra = await pedidoCompraService.gerarPedidoCompra({
      pedidoId: req.params.id,
      fornecedorId: req.body.fornecedorId,
      selecoes: req.body.selecoes || [],
    });
    res.status(201).json(pedidoCompra);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function receberItens(req, res) {
  try {
    const pedidoCompra = await pedidoCompraService.receberItens(req.params.id, req.body.itens || []);
    res.json(pedidoCompra);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function atualizarValoresItens(req, res) {
  try {
    const pedidoCompra = await pedidoCompraService.atualizarValoresItens(req.params.id, req.body.itens || []);
    res.json(pedidoCompra);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function marcarComoEncomendado(req, res) {
  const pedidoCompra = await PedidoCompra.findByPk(req.params.id);

  if (!pedidoCompra) {
    return res.status(404).json({ error: 'Pedido de compra não encontrado.' });
  }

  try {
    await pedidoCompraService.marcarComoEncomendado(pedidoCompra);
    res.json(pedidoCompra);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = { listar, buscarPorId, atualizar, remover, gerar, receberItens, atualizarValoresItens, marcarComoEncomendado };
