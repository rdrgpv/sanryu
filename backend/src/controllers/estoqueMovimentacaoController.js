const { sequelize, EstoqueMovimentacao, ProdutoVariacao } = require('../models');
const estoqueService = require('../services/estoqueService');

async function listar(req, res) {
  const where = {};
  if (req.query.produtoVariacaoId) where.produtoVariacaoId = req.query.produtoVariacaoId;

  const movimentacoes = await EstoqueMovimentacao.findAll({ where, order: [['dataMovimentacao', 'DESC']] });
  res.json(movimentacoes);
}

// Só cria movimento manual por aqui — pedidoCompraItemId/pedidoItemId ficam sempre nulos
// (movimentos automáticos são gerados pelos serviços de Pedido/PedidoCompra, não por este endpoint).
async function criar(req, res) {
  try {
    const variacao = await ProdutoVariacao.findByPk(req.body.produtoVariacaoId);
    if (!variacao) {
      return res.status(400).json({ error: 'Variação não encontrada.' });
    }

    const movimento = await sequelize.transaction(async (t) => {
      const mov = await EstoqueMovimentacao.create(
        {
          produtoVariacaoId: variacao.id,
          tipoMovimentacao: req.body.tipoMovimentacao,
          quantidade: req.body.quantidade,
          dataMovimentacao: req.body.dataMovimentacao || new Date(),
          documentoOrigem: req.body.documentoOrigem || null,
          observacao: req.body.observacao || null,
          pedidoCompraItemId: null,
          pedidoItemId: null,
        },
        { transaction: t }
      );
      await estoqueService.aplicarMovimento(variacao, mov.tipoMovimentacao, mov.quantidade, t);
      return mov;
    });

    res.status(201).json(movimento);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function atualizar(req, res) {
  const movimento = await EstoqueMovimentacao.findByPk(req.params.id);

  if (!movimento) {
    return res.status(404).json({ error: 'Movimentação não encontrada.' });
  }

  if (movimento.pedidoCompraItemId || movimento.pedidoItemId) {
    return res.status(400).json({ error: 'Movimentações geradas automaticamente por pedidos não podem ser editadas.' });
  }

  try {
    const novoTipo = req.body.tipoMovimentacao || movimento.tipoMovimentacao;
    const novaQuantidade = req.body.quantidade ?? movimento.quantidade;

    await sequelize.transaction(async (t) => {
      const variacao = await ProdutoVariacao.findByPk(movimento.produtoVariacaoId, { transaction: t });
      const deltaAntigo = estoqueService.delta(movimento.tipoMovimentacao, movimento.quantidade);
      const deltaNovo = estoqueService.delta(novoTipo, novaQuantidade);
      variacao.quantidadeEstoque += deltaNovo - deltaAntigo;
      await variacao.save({ transaction: t });

      await movimento.update(
        {
          tipoMovimentacao: novoTipo,
          quantidade: novaQuantidade,
          dataMovimentacao: req.body.dataMovimentacao || movimento.dataMovimentacao,
          documentoOrigem: req.body.documentoOrigem ?? movimento.documentoOrigem,
          observacao: req.body.observacao ?? movimento.observacao,
        },
        { transaction: t }
      );
    });

    res.json(movimento);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remover(req, res) {
  const movimento = await EstoqueMovimentacao.findByPk(req.params.id);

  if (!movimento) {
    return res.status(404).json({ error: 'Movimentação não encontrada.' });
  }

  if (movimento.pedidoCompraItemId || movimento.pedidoItemId) {
    return res.status(400).json({ error: 'Movimentações geradas automaticamente por pedidos não podem ser excluídas.' });
  }

  await sequelize.transaction(async (t) => {
    const variacao = await ProdutoVariacao.findByPk(movimento.produtoVariacaoId, { transaction: t });
    variacao.quantidadeEstoque -= estoqueService.delta(movimento.tipoMovimentacao, movimento.quantidade);
    await variacao.save({ transaction: t });
    await movimento.destroy({ transaction: t });
  });

  res.status(204).send();
}

module.exports = { listar, criar, atualizar, remover };
