const { Op, fn, col } = require('sequelize');

// "E" (Entrada) e "A" (Ajuste) somam ao saldo; "S" (Saída) subtrai. quantidade é sempre positiva,
// quem decide o sinal é o tipo do movimento.
const SINAL = { E: 1, S: -1, A: 1 };

function delta(tipoMovimentacao, quantidade) {
  return SINAL[tipoMovimentacao] * quantidade;
}

async function aplicarMovimento(produtoVariacao, tipoMovimentacao, quantidade, transaction) {
  produtoVariacao.quantidadeEstoque += delta(tipoMovimentacao, quantidade);
  await produtoVariacao.save({ transaction });
}

// Estoque reservado = soma de PedidoItem.quantidade em pedidos ainda não entregues/cancelados
// (situacao fora de F/E) — nunca persistido, calculado ao vivo a cada leitura. require tardio
// (não no topo do arquivo) porque models/index.js não referencia services — evita qualquer
// possibilidade de dependência circular se isso mudar no futuro.
async function calcularReservado(produtoVariacaoIds) {
  if (!produtoVariacaoIds || produtoVariacaoIds.length === 0) return {};

  const { PedidoItem, Pedido } = require('../models');

  const linhas = await PedidoItem.findAll({
    attributes: ['produtoVariacaoId', [fn('SUM', col('PedidoItem.quantidade')), 'total']],
    where: { produtoVariacaoId: { [Op.in]: produtoVariacaoIds } },
    include: [{ model: Pedido, as: 'pedido', attributes: [], where: { situacao: { [Op.notIn]: ['F', 'E'] } } }],
    group: ['PedidoItem.produtoVariacaoId'],
    raw: true,
  });

  return Object.fromEntries(linhas.map((l) => [l.produtoVariacaoId, Number(l.total)]));
}

// Mescla quantidadeReservada/saldoDisponivel no payload de uma ou mais ProdutoVariacao.
async function anexarSaldos(variacoes) {
  const lista = Array.isArray(variacoes) ? variacoes : [variacoes];
  const reservado = await calcularReservado(lista.map((v) => v.id));
  const resultado = lista.map((v) => {
    const json = v.toJSON ? v.toJSON() : v;
    const quantidadeReservada = reservado[v.id] || 0;
    return { ...json, quantidadeReservada, saldoDisponivel: json.quantidadeEstoque - quantidadeReservada };
  });
  return Array.isArray(variacoes) ? resultado : resultado[0];
}

// Confere se dá pra vender agora, descontando o que já está reservado pra encomendas em aberto.
// itens: [{ produtoVariacaoId, quantidade }] (repetidos são somados). Produto que não controla
// estoque passa direto. Devolve a lista do que falta (vazia = pode vender).
async function faltasParaVenda(itens, { ignorarPedidoId = null, transaction } = {}) {
  const { ProdutoVariacao, Produto, PedidoItem, Pedido } = require('../models');
  const pedidoPorVariacao = new Map();
  for (const item of itens) {
    pedidoPorVariacao.set(Number(item.produtoVariacaoId), (pedidoPorVariacao.get(Number(item.produtoVariacaoId)) || 0) + Number(item.quantidade));
  }

  const ids = [...pedidoPorVariacao.keys()];
  const variacoes = await ProdutoVariacao.findAll({
    where: { id: ids },
    include: [{ model: Produto, as: 'produto', attributes: ['descricao', 'controlaEstoque'] }, 'cor', 'tamanho'],
    transaction,
  });
  const reservado = await calcularReservado(ids);

  // O próprio pedido (ex.: pedido da loja sendo conferido) não conta como reserva contra ele mesmo.
  if (ignorarPedidoId) {
    const doPedido = await PedidoItem.findAll({ where: { pedidoId: ignorarPedidoId }, include: { model: Pedido, as: 'pedido', attributes: ['situacao'] }, transaction });
    doPedido.forEach((item) => {
      if (!['F', 'E'].includes(item.pedido?.situacao)) reservado[item.produtoVariacaoId] = (reservado[item.produtoVariacaoId] || 0) - item.quantidade;
    });
  }

  const faltas = [];
  for (const id of ids) {
    const variacao = variacoes.find((item) => item.id === id);
    if (!variacao || !variacao.ativo) {
      faltas.push({ produtoVariacaoId: id, motivo: 'inexistente', descricao: `Item ${id}` });
      continue;
    }
    if (variacao.produto && variacao.produto.controlaEstoque === false) continue;
    const disponivel = variacao.quantidadeEstoque - (reservado[id] || 0);
    if (pedidoPorVariacao.get(id) > disponivel) {
      faltas.push({
        produtoVariacaoId: id,
        motivo: 'sem-estoque',
        disponivel: Math.max(0, disponivel),
        pedido: pedidoPorVariacao.get(id),
        descricao: [variacao.produto?.descricao, variacao.cor?.descricao, variacao.tamanho?.descricao].filter(Boolean).join(' '),
      });
    }
  }
  return faltas;
}

function mensagemFaltas(faltas) {
  return `Sem estoque suficiente: ${faltas.map((falta) => (falta.motivo === 'sem-estoque' ? `${falta.descricao} (disponível ${falta.disponivel})` : falta.descricao)).join('; ')}.`;
}

module.exports = { delta, aplicarMovimento, calcularReservado, anexarSaldos, faltasParaVenda, mensagemFaltas };
