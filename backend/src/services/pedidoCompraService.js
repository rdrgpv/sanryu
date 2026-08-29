const { Op, fn, col } = require('sequelize');
const {
  sequelize,
  Pedido,
  PedidoItem,
  PedidoItemCompra,
  PedidoCompra,
  PedidoCompraItem,
  ProdutoVariacao,
  EstoqueMovimentacao,
} = require('../models');
const estoqueService = require('../services/estoqueService');

async function calcularAlocado(pedidoItemIds, transaction) {
  if (!pedidoItemIds || pedidoItemIds.length === 0) return {};

  const linhas = await PedidoItemCompra.findAll({
    attributes: ['pedidoItemId', [fn('SUM', col('quantidade')), 'total']],
    where: { pedidoItemId: { [Op.in]: pedidoItemIds } },
    group: ['pedidoItemId'],
    raw: true,
    transaction,
  });

  return Object.fromEntries(linhas.map((l) => [l.pedidoItemId, Number(l.total)]));
}

// Substitui de vez a versão-stub da Fase 2 (mesmo formato de retorno — pedidoController não muda).
async function calcularItensPendentesCompra(pedido, transaction) {
  const itens = await PedidoItem.findAll({ where: { pedidoId: pedido.id }, transaction });
  const alocado = await calcularAlocado(itens.map((i) => i.id), transaction);

  return itens.map((i) => ({
    pedidoItemId: i.id,
    produtoVariacaoId: i.produtoVariacaoId,
    quantidade: i.quantidade,
    pendente: i.quantidade - (alocado[i.id] || 0),
  }));
}

// Gera um novo PedidoCompra a partir de linhas pendentes de UM Pedido de venda. Valida tudo antes
// de escrever qualquer coisa (lote tudo-ou-nada): cada seleção precisa pertencer ao pedido e não
// pode exceder o que ainda está pendente de alocação.
async function gerarPedidoCompra({ pedidoId, fornecedorId, selecoes }) {
  const pedido = await Pedido.findByPk(pedidoId, { include: ['itens'] });
  if (!pedido) throw new Error('Pedido não encontrado.');
  if (!selecoes || selecoes.length === 0) throw new Error('Selecione ao menos um item para gerar o pedido de compra.');

  const pendentes = await calcularItensPendentesCompra(pedido);
  const pendentePorItem = Object.fromEntries(pendentes.map((p) => [p.pedidoItemId, p.pendente]));
  const itemIdsDoPedido = new Set(pedido.itens.map((i) => i.id));

  for (const sel of selecoes) {
    if (!itemIdsDoPedido.has(sel.pedidoItemId)) {
      throw new Error(`Item ${sel.pedidoItemId} não pertence a este pedido.`);
    }
    if (!(sel.quantidade > 0) || sel.quantidade > (pendentePorItem[sel.pedidoItemId] || 0)) {
      throw new Error(`Quantidade inválida para o item ${sel.pedidoItemId} (excede o pendente).`);
    }
  }

  return sequelize.transaction(async (t) => {
    const pedidoCompra = await PedidoCompra.create({ fornecedorId, situacao: 'P', valorTotal: 0 }, { transaction: t });

    let valorTotal = 0;
    for (const sel of selecoes) {
      const pedidoItem = pedido.itens.find((i) => i.id === sel.pedidoItemId);
      const variacao = await ProdutoVariacao.findByPk(pedidoItem.produtoVariacaoId, { transaction: t });
      const valorTotalItem = sel.quantidade * Number(variacao.valorCusto);

      const pcItem = await PedidoCompraItem.create(
        {
          pedidoCompraId: pedidoCompra.id,
          produtoVariacaoId: variacao.id,
          quantidade: sel.quantidade,
          quantidadeRecebida: 0,
          valorUnitario: variacao.valorCusto,
          valorTotal: valorTotalItem,
        },
        { transaction: t }
      );

      await PedidoItemCompra.create(
        { pedidoItemId: sel.pedidoItemId, pedidoCompraItemId: pcItem.id, quantidade: sel.quantidade },
        { transaction: t }
      );

      valorTotal += valorTotalItem;
    }

    await pedidoCompra.update({ valorTotal }, { transaction: t });

    // Reavalia a alocação de TODO o pedido (todos os vínculos, não só este lote) — só avança de P
    // pra C quando cada linha estiver 100% coberta, cumulativamente entre várias gerações.
    if (pedido.situacao === 'P') {
      const pendentesAgora = await calcularItensPendentesCompra(pedido, t);
      const tudoAlocado = pendentesAgora.every((p) => p.pendente === 0);
      if (tudoAlocado) await pedido.update({ situacao: 'C' }, { transaction: t });
    }

    return PedidoCompra.findByPk(pedidoCompra.id, { include: ['itens'], transaction: t });
  });
}

async function receberItens(pedidoCompraId, linhas) {
  const pedidoCompra = await PedidoCompra.findByPk(pedidoCompraId, { include: ['itens'] });
  if (!pedidoCompra) throw new Error('Pedido de compra não encontrado.');
  if (['R', 'E'].includes(pedidoCompra.situacao)) {
    throw new Error('Pedido de compra já recebido ou cancelado.');
  }

  return sequelize.transaction(async (t) => {
    for (const linha of linhas) {
      const item = pedidoCompra.itens.find((i) => i.id === linha.pedidoCompraItemId);
      if (!item) throw new Error(`Item ${linha.pedidoCompraItemId} não pertence a este pedido de compra.`);

      const pendente = item.quantidade - item.quantidadeRecebida;
      // Nunca erro por pedir mais do que o pendente — só limita silenciosamente (igual ao sistema
      // de referência), pra não travar um recebimento por causa de um número digitado a mais.
      const aceitar = Math.max(0, Math.min(linha.quantidade, pendente));

      if (aceitar > 0) {
        const variacao = await ProdutoVariacao.findByPk(item.produtoVariacaoId, { transaction: t });
        await EstoqueMovimentacao.create(
          {
            produtoVariacaoId: item.produtoVariacaoId,
            tipoMovimentacao: 'E',
            quantidade: aceitar,
            pedidoCompraItemId: item.id,
            documentoOrigem: `Pedido de Compra #${pedidoCompra.id}`,
            dataMovimentacao: new Date(),
          },
          { transaction: t }
        );
        await estoqueService.aplicarMovimento(variacao, 'E', aceitar, t);
        await item.update({ quantidadeRecebida: item.quantidadeRecebida + aceitar }, { transaction: t });
      }
    }

    const itensAtualizados = await PedidoCompraItem.findAll({ where: { pedidoCompraId: pedidoCompra.id }, transaction: t });
    const tudoRecebido = itensAtualizados.every((i) => i.quantidadeRecebida >= i.quantidade);
    if (tudoRecebido && ['P', 'X', 'PG'].includes(pedidoCompra.situacao)) {
      await pedidoCompra.update({ situacao: 'R', dataRecebimento: new Date() }, { transaction: t });
    }

    return PedidoCompra.findByPk(pedidoCompra.id, { include: ['itens'], transaction: t });
  });
}

async function marcarComoEncomendado(pedidoCompra) {
  if (pedidoCompra.situacao !== 'P') {
    throw new Error('Só é possível marcar como encomendado um pedido de compra pendente.');
  }
  await pedidoCompra.update({ situacao: 'X', dataEncomenda: new Date() });
}

async function marcarComoPago(pedidoCompra) {
  if (pedidoCompra.situacao !== 'X') {
    throw new Error('Só é possível marcar como pago um pedido de compra encomendado.');
  }
  await pedidoCompra.update({ situacao: 'PG', dataPagamento: new Date() });
}

// Ajusta o valor unitário negociado com o fornecedor — o valor gravado na geração do pedido é só
// um ponto de partida (cópia do custo cadastrado na variação) e pode não bater com o que foi
// fechado de verdade. De propósito NÃO mexe no valorCusto da ProdutoVariacao: o ajuste vale só
// para este pedido de compra, sem virar o novo custo padrão do produto pra sempre.
async function atualizarValoresItens(pedidoCompraId, itens) {
  const pedidoCompra = await PedidoCompra.findByPk(pedidoCompraId, { include: ['itens'] });
  if (!pedidoCompra) throw new Error('Pedido de compra não encontrado.');

  if (!['P', 'X'].includes(pedidoCompra.situacao)) {
    throw new Error('Só é possível editar o valor de um pedido de compra pendente ou encomendado.');
  }

  return sequelize.transaction(async (t) => {
    for (const linha of itens) {
      const item = pedidoCompra.itens.find((i) => i.id === linha.id);
      if (!item) throw new Error(`Item ${linha.id} não pertence a este pedido de compra.`);

      const valorUnitario = Number(linha.valorUnitario);
      if (!(valorUnitario >= 0)) throw new Error('Valor unitário inválido.');

      await item.update({ valorUnitario, valorTotal: valorUnitario * item.quantidade }, { transaction: t });
    }

    const itensAtualizados = await PedidoCompraItem.findAll({ where: { pedidoCompraId: pedidoCompra.id }, transaction: t });
    const valorTotal = itensAtualizados.reduce((soma, i) => soma + Number(i.valorTotal), 0);
    await pedidoCompra.update({ valorTotal }, { transaction: t });

    return PedidoCompra.findByPk(pedidoCompra.id, { include: ['itens'], transaction: t });
  });
}

module.exports = {
  calcularAlocado,
  calcularItensPendentesCompra,
  gerarPedidoCompra,
  receberItens,
  marcarComoEncomendado,
  marcarComoPago,
  atualizarValoresItens,
};
