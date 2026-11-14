const { Op } = require('sequelize');
const { sequelize, PagamentoCompra, PedidoCompra, Fornecedor, Lancamento } = require('../models');
const financeiroService = require('./financeiroService');

const INCLUDE = [
  { model: Fornecedor, as: 'fornecedor', attributes: ['id', 'nome'] },
  { model: PedidoCompra, as: 'pedidos', attributes: ['id', 'situacao', 'valorTotal', 'dataPedido', 'dataPagamento'] },
];

// Junta a conta a pagar de cada grupo (status, valor) pra tela saber se ainda dá pra desfazer.
async function listar() {
  await financeiroService.sincronizarOrigens();
  const [grupos, lancamentos] = await Promise.all([
    PagamentoCompra.findAll({ include: INCLUDE, order: [['id', 'DESC']] }),
    Lancamento.findAll({ where: { origem: 'pagamentoCompra' }, attributes: ['id', 'origemId', 'status', 'valor', 'vencimento', 'dataPagamento'] }),
  ]);
  const porGrupo = new Map(lancamentos.map((lancamento) => [lancamento.origemId, lancamento]));

  return grupos.map((grupo) => ({ ...grupo.toJSON(), lancamento: porGrupo.get(grupo.id) || null }));
}

// Pedidos que podem entrar num pagamento agrupado: não cancelados, ainda não pagos, com valor e
// fora de outro grupo.
function podeAgrupar(pedido) {
  return pedido.situacao !== 'E' && !pedido.dataPagamento && !pedido.pagamentoCompraId && Number(pedido.valorTotal) > 0;
}

async function criar({ pedidoCompraIds, vencimento, observacao }) {
  const ids = [...new Set((pedidoCompraIds || []).map(Number).filter(Number.isInteger))];
  if (ids.length < 2) throw new Error('Escolha pelo menos dois pedidos de compra para agrupar.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vencimento || '')) throw new Error('Informe o vencimento do pagamento.');

  const grupo = await sequelize.transaction(async (transaction) => {
    const pedidos = await PedidoCompra.findAll({ where: { id: { [Op.in]: ids } }, transaction, lock: transaction.LOCK?.UPDATE });
    if (pedidos.length !== ids.length) throw new Error('Algum pedido de compra não foi encontrado.');

    const fornecedores = new Set(pedidos.map((pedido) => pedido.fornecedorId));
    if (fornecedores.size > 1) throw new Error('Só dá para agrupar pedidos do mesmo fornecedor.');

    const invalido = pedidos.find((pedido) => !podeAgrupar(pedido));
    if (invalido) {
      throw new Error(`O pedido de compra #${invalido.id} não pode ser agrupado (cancelado, já pago, sem valor ou já em outro pagamento).`);
    }

    const novo = await PagamentoCompra.create(
      { fornecedorId: pedidos[0].fornecedorId, vencimento, observacao: (observacao || '').trim() || null },
      { transaction }
    );
    await PedidoCompra.update({ pagamentoCompraId: novo.id }, { where: { id: { [Op.in]: ids } }, transaction });
    return novo;
  });

  // Troca as contas a pagar individuais pela do grupo já agora (sem esperar a rotina horária).
  await financeiroService.sincronizarOrigens();
  return PagamentoCompra.findByPk(grupo.id, { include: INCLUDE });
}

// Desfaz o agrupamento enquanto não foi pago: cada pedido volta a ter a própria conta a pagar.
async function desfazer(id) {
  const grupo = await PagamentoCompra.findByPk(id);
  if (!grupo) throw new Error('Pagamento agrupado não encontrado.');

  const lancamento = await Lancamento.findOne({ where: { origem: 'pagamentoCompra', origemId: grupo.id } });
  if (lancamento?.status === 'pago') throw new Error('Este pagamento já foi pago. Estorne a baixa em Contas a pagar antes de desfazer.');

  await sequelize.transaction(async (transaction) => {
    await PedidoCompra.update({ pagamentoCompraId: null }, { where: { pagamentoCompraId: grupo.id }, transaction });
    if (lancamento) await lancamento.destroy({ transaction });
    await grupo.destroy({ transaction });
  });

  await financeiroService.sincronizarOrigens();
}

module.exports = { listar, criar, desfazer, podeAgrupar };
