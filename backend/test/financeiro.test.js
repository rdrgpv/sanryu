const ajuda = require('./ajuda');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { chamar, models, hoje } = ajuda;

let caixa;
let banco;

before(async () => {
  await ajuda.iniciar();
  caixa = (await chamar('POST', '/admin/financeiro/contas', { corpo: { nome: 'Caixa', tipo: 'caixa', saldoInicial: 100, dataSaldoInicial: '2026-01-01', formasPadrao: ['dinheiro'] } })).dados;
  banco = (await chamar('POST', '/admin/financeiro/contas', { corpo: { nome: 'Banco', tipo: 'banco', saldoInicial: 1000, dataSaldoInicial: '2026-01-01', formasPadrao: ['cartao', 'transferencia'] } })).dados;
});
after(ajuda.encerrar);

async function saldo(contaId) {
  const contas = (await chamar('GET', '/admin/financeiro/contas')).dados.contas;
  return contas.find((conta) => conta.id === contaId).saldo;
}

test('categorias padrão existem e não duplicam', async () => {
  const categorias = (await chamar('GET', '/admin/financeiro/categorias')).dados;
  assert.equal(categorias.filter((categoria) => categoria.chave === 'mensalidades').length, 1);
  assert.ok(categorias.length >= 15);
});

test('cada forma de pagamento fica numa conta só', async () => {
  await chamar('PUT', `/admin/financeiro/contas/${banco.id}`, { corpo: { ...banco, formasPadrao: ['cartao', 'transferencia', 'dinheiro'] } });
  assert.equal((await models.ContaFinanceira.findByPk(caixa.id)).formasPadrao, null);
  await chamar('PUT', `/admin/financeiro/contas/${caixa.id}`, { corpo: { ...caixa, formasPadrao: ['dinheiro'] } });
  assert.equal((await models.ContaFinanceira.findByPk(banco.id)).formasPadrao, 'cartao,transferencia');
});

test('parcelamento divide o total e acerta os centavos na primeira parcela', async () => {
  const parcelas = (await chamar('POST', '/admin/financeiro/lancamentos', { corpo: { tipo: 'despesa', descricao: 'Tatame', valor: 100, vencimento: '2026-01-31', parcelas: 3 } })).dados;
  assert.deepEqual(parcelas.map((parcela) => Number(parcela.valor)), [33.34, 33.33, 33.33]);
  assert.deepEqual(parcelas.map((parcela) => parcela.vencimento), ['2026-01-31', '2026-02-28', '2026-03-31']);
});

test('despesa paga na hora sai da conta da forma de pagamento', async () => {
  const antes = await saldo(caixa.id);
  await chamar('POST', '/admin/financeiro/lancamentos', { corpo: { tipo: 'despesa', descricao: 'Limpeza', valor: 30, vencimento: hoje(), pago: true, formaPagamento: 'dinheiro' } });
  assert.equal(await saldo(caixa.id), antes - 30);
});

test('pedido de compra vira conta a pagar; pagar no financeiro reflete no pedido; estornar desfaz', async () => {
  const fornecedor = await models.Fornecedor.create({ nome: 'Fornecedor' });
  const compra = await models.PedidoCompra.create({ fornecedorId: fornecedor.id, dataPedido: new Date(), situacao: 'X', valorTotal: 300 });
  await chamar('GET', '/admin/financeiro/lancamentos');
  const lancamento = await models.Lancamento.findOne({ where: { origem: 'pedidoCompra', origemId: compra.id } });
  assert.equal(lancamento.status, 'pendente');

  // Ajuste do admin (vencimento) sobrevive à sincronização; valor vem da origem.
  await chamar('PUT', `/admin/financeiro/lancamentos/${lancamento.id}`, { corpo: { vencimento: '2026-12-01', valor: 1 } });
  await chamar('GET', '/admin/financeiro/lancamentos');
  await lancamento.reload();
  assert.equal(lancamento.vencimento, '2026-12-01');
  assert.equal(Number(lancamento.valor), 300);

  const antes = await saldo(banco.id);
  await chamar('POST', `/admin/financeiro/lancamentos/${lancamento.id}/baixar`, { corpo: { valorPago: 300, formaPagamento: 'transferencia', dataPagamento: hoje() } });
  await compra.reload();
  assert.equal(compra.situacao, 'PG');
  assert.equal(await saldo(banco.id), antes - 300);

  await chamar('POST', `/admin/financeiro/lancamentos/${lancamento.id}/estornar`);
  await compra.reload();
  assert.equal(compra.situacao, 'X');
  assert.equal(compra.dataPagamento, null);
});

test('venda da loja vira conta a receber; cancelada em aberto é cancelada', async () => {
  const venda = await models.Pedido.create({ nomeCliente: 'Cliente', dataPedido: new Date(), valorProdutos: 50, valorPersonalizacoes: 0, valorDesconto: 0, valorTotal: 50, situacao: 'P' });
  await chamar('GET', '/admin/financeiro/lancamentos');
  const lancamento = await models.Lancamento.findOne({ where: { origem: 'pedido', origemId: venda.id } });
  assert.equal(lancamento.tipo, 'receita');

  assert.equal((await chamar('POST', `/admin/financeiro/lancamentos/${lancamento.id}/cancelar`, { corpo: {} })).status, 400);
  await venda.update({ situacao: 'E' });
  await chamar('GET', '/admin/financeiro/lancamentos');
  assert.equal((await lancamento.reload()).status, 'cancelado');
});

test('recorrência gera um lançamento por mês, sem duplicar', async () => {
  const inicio = `${hoje().slice(0, 7)}-01`;
  const recorrencia = await chamar('POST', '/admin/financeiro/recorrencias', { corpo: { descricao: 'Aluguel', valor: 2000, diaVencimento: 5, dataInicio: inicio } });
  assert.equal(recorrencia.status, 201);
  const primeira = await models.Lancamento.count({ where: { origem: 'recorrencia', origemId: recorrencia.dados.id } });
  assert.ok(primeira >= 1);
  await chamar('PUT', `/admin/financeiro/recorrencias/${recorrencia.dados.id}`, { corpo: { ...recorrencia.dados, valor: 2100 } });
  assert.equal(await models.Lancamento.count({ where: { origem: 'recorrencia', origemId: recorrencia.dados.id } }), primeira);
});

test('transferência mexe nas duas contas e exige contas diferentes', async () => {
  const caixaAntes = await saldo(caixa.id);
  const bancoAntes = await saldo(banco.id);
  await chamar('POST', '/admin/financeiro/transferencias', { corpo: { contaOrigemId: caixa.id, contaDestinoId: banco.id, valor: 50, data: hoje() } });
  assert.equal(await saldo(caixa.id), caixaAntes - 50);
  assert.equal(await saldo(banco.id), bancoAntes + 50);
  assert.equal((await chamar('POST', '/admin/financeiro/transferencias', { corpo: { contaOrigemId: caixa.id, contaDestinoId: caixa.id, valor: 5, data: hoje() } })).status, 400);
});

test('não exclui lançamento automático nem conta com movimento', async () => {
  const automatico = await models.Lancamento.findOne({ where: { origem: 'recorrencia' } });
  assert.equal((await chamar('DELETE', `/admin/financeiro/lancamentos/${automatico.id}`)).status, 400);
  assert.equal((await chamar('DELETE', `/admin/financeiro/contas/${caixa.id}`)).status, 400);
});
