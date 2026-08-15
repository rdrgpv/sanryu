const { sequelize, Pedido, PedidoItem, PedidoItemPersonalizacao, ProdutoVariacao, Produto, Cor, Tamanho, TipoPersonalizacao } = require('../models');
const pedidoService = require('../services/pedidoService');
const pedidoCompraService = require('../services/pedidoCompraService');

const INCLUDE_ITENS = {
  model: PedidoItem,
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
    {
      model: PedidoItemPersonalizacao,
      as: 'personalizacoes',
      include: [{ model: TipoPersonalizacao, as: 'tipoPersonalizacao' }],
    },
  ],
};

async function listar(req, res) {
  const where = {};
  if (req.query.situacao) where.situacao = req.query.situacao;

  const pedidos = await Pedido.findAll({ where, order: [['dataPedido', 'DESC']] });
  res.json(pedidos);
}

async function buscarPorId(req, res) {
  const pedido = await Pedido.findByPk(req.params.id, { include: [INCLUDE_ITENS] });

  if (!pedido) {
    return res.status(404).json({ error: 'Pedido não encontrado.' });
  }

  res.json(pedido);
}

async function criar(req, res) {
  try {
    const pedido = await sequelize.transaction(async (t) => {
      const novo = await Pedido.create(
        {
          nomeCliente: req.body.nomeCliente,
          telefoneCliente: req.body.telefoneCliente || null,
          emailCliente: req.body.emailCliente || null,
          dataPedido: req.body.dataPedido || new Date(),
          situacao: 'P',
          valorDesconto: req.body.valorDesconto || 0,
          dataPrevistaEntrega: req.body.dataPrevistaEntrega || null,
          observacao: req.body.observacao || null,
        },
        { transaction: t }
      );

      const itensCriados = await pedidoService.salvarItens(novo, req.body.itens, t);
      await pedidoService.recalcularTotais(novo, itensCriados, t);
      return novo;
    });

    res.status(201).json(await Pedido.findByPk(pedido.id, { include: [INCLUDE_ITENS] }));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function atualizar(req, res) {
  const pedido = await Pedido.findByPk(req.params.id);

  if (!pedido) {
    return res.status(404).json({ error: 'Pedido não encontrado.' });
  }

  // F só é setado pela ação "entregar" e C só automaticamente na geração de pedido de compra
  // (Fase 3) — pela edição genérica só é permitido manter pendente ou cancelar.
  if (req.body.situacao !== undefined && !['P', 'E'].includes(req.body.situacao)) {
    return res.status(400).json({ error: 'Situação inválida para atualização direta. Use as ações específicas.' });
  }

  try {
    await sequelize.transaction(async (t) => {
      await pedido.update(
        {
          nomeCliente: req.body.nomeCliente,
          telefoneCliente: req.body.telefoneCliente || null,
          emailCliente: req.body.emailCliente || null,
          situacao: req.body.situacao || pedido.situacao,
          valorDesconto: req.body.valorDesconto || 0,
          dataPrevistaEntrega: req.body.dataPrevistaEntrega || null,
          observacao: req.body.observacao || null,
        },
        { transaction: t }
      );

      const itensCriados = await pedidoService.salvarItens(pedido, req.body.itens, t);
      await pedidoService.recalcularTotais(pedido, itensCriados, t);
    });

    res.json(await Pedido.findByPk(pedido.id, { include: [INCLUDE_ITENS] }));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remover(req, res) {
  const pedido = await Pedido.findByPk(req.params.id);

  if (!pedido) {
    return res.status(404).json({ error: 'Pedido não encontrado.' });
  }

  if (pedido.situacao !== 'P') {
    return res.status(400).json({ error: 'Só é possível excluir pedidos pendentes.' });
  }

  await pedido.destroy();
  res.status(204).send();
}

async function entregar(req, res) {
  const pedido = await Pedido.findByPk(req.params.id);

  if (!pedido) {
    return res.status(404).json({ error: 'Pedido não encontrado.' });
  }

  try {
    await sequelize.transaction((t) => pedidoService.entregar(pedido, t));
    res.json(await Pedido.findByPk(pedido.id, { include: [INCLUDE_ITENS] }));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function itensPendentesCompra(req, res) {
  const pedido = await Pedido.findByPk(req.params.id);

  if (!pedido) {
    return res.status(404).json({ error: 'Pedido não encontrado.' });
  }

  res.json(await pedidoCompraService.calcularItensPendentesCompra(pedido));
}

module.exports = { listar, buscarPorId, criar, atualizar, remover, entregar, itensPendentesCompra };
