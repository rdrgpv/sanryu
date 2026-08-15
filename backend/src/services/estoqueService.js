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

module.exports = { delta, aplicarMovimento, calcularReservado, anexarSaldos };
