const ajuda = require('./ajuda');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { chamar, models, hoje, somarDias } = ajuda;
const financeiroService = require('../src/services/financeiroService');

let fornecedor;
let outroFornecedor;
let variacao;

async function compra(dados = {}) {
  return models.PedidoCompra.create({ fornecedorId: fornecedor.id, situacao: 'X', valorTotal: 100, ...dados });
}

async function lancamentosDe(origem, origemId) {
  return models.Lancamento.findAll({ where: { origem, origemId } });
}

before(async () => {
  await ajuda.iniciar();
  fornecedor = (await chamar('POST', '/admin/fornecedores', { corpo: { nome: 'Kimonos SA', prazoEntregaDias: 7 } })).dados;
  outroFornecedor = await models.Fornecedor.create({ nome: 'Faixas Ltda' });
  const produto = await models.Produto.create({ descricao: 'Kimono' });
  variacao = await models.ProdutoVariacao.create({ produtoId: produto.id, codigo: 'VAR-K', valorCusto: 50, valorVenda: 120, quantidadeEstoque: 0 });
});

after(async () => {
  await ajuda.encerrar();
});

test('prazo de entrega do fornecedor preenche a previsão do pedido de compra gerado', async () => {
  assert.equal(fornecedor.prazoEntregaDias, 7);
  assert.equal((await chamar('POST', '/admin/fornecedores', { corpo: { nome: 'X', prazoEntregaDias: -1 } })).status, 400);

  const gerado = await chamar('POST', '/admin/estoque/reposicao/pedido-compra', { corpo: { fornecedorId: fornecedor.id, itens: [{ produtoVariacaoId: variacao.id, quantidade: 2 }] } });
  assert.equal(gerado.status, 201);
  const pedido = await models.PedidoCompra.findByPk(gerado.dados.id);
  assert.equal(pedido.dataPrevistaEntrega, somarDias(hoje(), 7));

  // Fornecedor sem prazo: previsão em branco.
  const semPrazo = await chamar('POST', '/admin/estoque/reposicao/pedido-compra', { corpo: { fornecedorId: outroFornecedor.id, itens: [{ produtoVariacaoId: variacao.id, quantidade: 1 }] } });
  assert.equal((await models.PedidoCompra.findByPk(semPrazo.dados.id)).dataPrevistaEntrega, null);
});

test('pagamento agrupado: uma conta a pagar no lugar das individuais, baixa paga todos e estorno volta', async () => {
  const a = await compra({ valorTotal: 100 });
  const b = await compra({ valorTotal: 50.5 });
  await financeiroService.sincronizarOrigens();
  assert.equal((await lancamentosDe('pedidoCompra', a.id)).length, 1);

  const vencimento = somarDias(hoje(), 10);
  const grupo = await chamar('POST', '/admin/pagamentos-compra', { corpo: { pedidoCompraIds: [a.id, b.id], vencimento } });
  assert.equal(grupo.status, 201);

  assert.equal((await lancamentosDe('pedidoCompra', a.id)).length, 0, 'a conta individual sai');
  const [conta] = await lancamentosDe('pagamentoCompra', grupo.dados.id);
  assert.equal(Number(conta.valor), 150.5);
  assert.equal(conta.vencimento, vencimento);
  assert.equal(conta.status, 'pendente');

  // Não marca pago pelo pedido: a baixa é no contas a pagar.
  assert.equal((await chamar('POST', `/admin/pedidos-compra/${a.id}/marcar-pago`)).status, 400);

  const baixa = await chamar('POST', `/admin/financeiro/lancamentos/${conta.id}/baixar`, { corpo: { valorPago: 150.5, formaPagamento: 'pix' } });
  assert.equal(baixa.status, 200);
  for (const pedido of [a, b]) {
    await pedido.reload();
    assert.ok(pedido.dataPagamento);
    assert.equal(pedido.situacao, 'PG');
  }

  // Pago não dá pra desfazer; estorna primeiro.
  assert.equal((await chamar('DELETE', `/admin/pagamentos-compra/${grupo.dados.id}`)).status, 400);
  assert.equal((await chamar('POST', `/admin/financeiro/lancamentos/${conta.id}/estornar`)).status, 200);
  await a.reload();
  assert.equal(a.dataPagamento, null);
  assert.equal(a.situacao, 'X');

  assert.equal((await chamar('DELETE', `/admin/pagamentos-compra/${grupo.dados.id}`)).status, 204);
  await a.reload();
  assert.equal(a.pagamentoCompraId, null);
  assert.equal((await lancamentosDe('pagamentoCompra', grupo.dados.id)).length, 0);
  assert.equal((await lancamentosDe('pedidoCompra', a.id)).length, 1, 'a conta individual volta');
});

test('pagamento agrupado: valida fornecedor, pedidos já pagos e recalcula com cancelamento', async () => {
  const a = await compra({ valorTotal: 80 });
  const b = await compra({ valorTotal: 20 });
  const deOutro = await compra({ fornecedorId: outroFornecedor.id });
  const pago = await compra({ dataPagamento: new Date(), situacao: 'PG' });
  const vencimento = hoje();

  assert.equal((await chamar('POST', '/admin/pagamentos-compra', { corpo: { pedidoCompraIds: [a.id], vencimento } })).status, 400);
  assert.equal((await chamar('POST', '/admin/pagamentos-compra', { corpo: { pedidoCompraIds: [a.id, deOutro.id], vencimento } })).status, 400);
  assert.equal((await chamar('POST', '/admin/pagamentos-compra', { corpo: { pedidoCompraIds: [a.id, pago.id], vencimento } })).status, 400);

  const grupo = await chamar('POST', '/admin/pagamentos-compra', { corpo: { pedidoCompraIds: [a.id, b.id], vencimento } });
  assert.equal(grupo.status, 201);
  assert.equal((await chamar('POST', '/admin/pagamentos-compra', { corpo: { pedidoCompraIds: [a.id, b.id], vencimento } })).status, 400, 'já agrupados');

  await b.update({ situacao: 'E' });
  await financeiroService.sincronizarOrigens();
  const [conta] = await lancamentosDe('pagamentoCompra', grupo.dados.id);
  assert.equal(Number(conta.valor), 80, 'cancelado sai da soma');

  const lista = await chamar('GET', '/admin/pagamentos-compra');
  assert.equal(lista.dados.find((item) => item.id === grupo.dados.id).lancamento.status, 'pendente');
});

test('evento aceita só link do Google Maps no mapa', async () => {
  const tipo = await models.TipoEvento.create({ nome: 'Seminário' });
  const base = { nome: 'Seminário', data: new Date().toISOString(), tipoEventoId: tipo.id, local: 'Céu Carrão' };

  assert.equal((await chamar('POST', '/admin/eventos', { corpo: { ...base, linkMapa: 'https://site-qualquer.com/maps' } })).status, 400);
  const criado = await chamar('POST', '/admin/eventos', { corpo: { ...base, linkMapa: ' https://maps.app.goo.gl/AbC123 ' } });
  assert.equal(criado.status, 201);
  assert.equal(criado.dados.linkMapa, 'https://maps.app.goo.gl/AbC123');
});

test('comprovante do pagamento agrupado traz fornecedor, pedidos com itens e a conta a pagar', async () => {
  await models.Fornecedor.update({ telefone: '(11) 98888-7777' }, { where: { id: fornecedor.id } });
  const a = await compra({ valorTotal: 100 });
  const b = await compra({ valorTotal: 60 });
  await models.PedidoCompraItem.create({ pedidoCompraId: a.id, produtoVariacaoId: variacao.id, quantidade: 2, valorUnitario: 50, valorTotal: 100 });
  const grupo = await chamar('POST', '/admin/pagamentos-compra', { corpo: { pedidoCompraIds: [a.id, b.id], vencimento: hoje() } });

  const comprovante = await chamar('GET', `/admin/pagamentos-compra/${grupo.dados.id}`);
  assert.equal(comprovante.status, 200);
  assert.equal(comprovante.dados.fornecedor.telefone, '(11) 98888-7777');
  assert.equal(Number(comprovante.dados.lancamento.valor), 160);
  const pedidoA = comprovante.dados.pedidos.find((pedido) => pedido.id === a.id);
  assert.equal(pedidoA.itens[0].produtoVariacao.codigo, 'VAR-K');
  assert.equal(pedidoA.itens[0].produtoVariacao.produto.descricao, 'Kimono');

  assert.equal((await chamar('GET', '/admin/pagamentos-compra/99999')).status, 404);
});
