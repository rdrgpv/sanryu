const ajuda = require('./ajuda');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { chamar, models, emails, token } = ajuda;

let caixa;
let kimonoM;
let kimonoG;
let faixa;
let semControle;
let fornecedor;

async function variacao(produto, codigo, { custo, venda, estoque = 0, minimo = 0, ideal = null }) {
  const nova = await models.ProdutoVariacao.create({ produtoId: produto.id, codigo, valorCusto: custo, valorVenda: venda, quantidadeEstoque: estoque, estoqueMinimo: minimo, estoqueIdeal: ideal });
  if (estoque) await models.EstoqueMovimentacao.create({ produtoVariacaoId: nova.id, tipoMovimentacao: 'E', quantidade: estoque, dataMovimentacao: new Date(), documentoOrigem: 'Teste' });
  return nova;
}

before(async () => {
  await ajuda.iniciar();
  caixa = (await chamar('POST', '/admin/financeiro/contas', { corpo: { nome: 'Caixa', tipo: 'caixa', saldoInicial: 0, dataSaldoInicial: '2026-01-01', formasPadrao: ['dinheiro'] } })).dados;
  await chamar('POST', '/admin/financeiro/contas', { corpo: { nome: 'Mercado Pago', tipo: 'mercadopago', saldoInicial: 0, dataSaldoInicial: '2026-01-01', formasPadrao: ['pix'] } });

  const kimono = await models.Produto.create({ descricao: 'Kimono', vendaOnline: true });
  const produtoFaixa = await models.Produto.create({ descricao: 'Faixa' });
  const bordado = await models.Produto.create({ descricao: 'Bordado', controlaEstoque: false });
  kimonoM = await variacao(kimono, 'VAR-KM', { custo: 100, venda: 250, estoque: 3, minimo: 2, ideal: 6 });
  kimonoG = await variacao(kimono, 'VAR-KG', { custo: 100, venda: 260, estoque: 0 });
  faixa = await variacao(produtoFaixa, 'VAR-FX', { custo: 10, venda: 30, estoque: 10, minimo: 4 });
  semControle = await variacao(bordado, 'VAR-BD', { custo: 0, venda: 40 });
  fornecedor = await models.Fornecedor.create({ nome: 'Fornecedor' });
});
after(ajuda.encerrar);

test('balcão: busca por código exato (leitor) e por nome', async () => {
  const porCodigo = (await chamar('GET', '/admin/balcao/produtos?busca=var-km')).dados;
  assert.equal(porCodigo[0].codigo, 'VAR-KM');
  assert.equal(porCodigo[0].exato, true);
  const porNome = (await chamar('GET', '/admin/balcao/produtos?busca=kimo')).dados;
  assert.equal(porNome.length, 2);
});

test('balcão: bloqueia sem estoque, considerando o reservado por encomendas', async () => {
  // Encomenda em aberto reserva 2 dos 3 kimonos M.
  const encomenda = await models.Pedido.create({ nomeCliente: 'Encomenda', dataPedido: new Date(), situacao: 'P' });
  await models.PedidoItem.create({ pedidoId: encomenda.id, produtoVariacaoId: kimonoM.id, quantidade: 2, valorUnitario: 250, valorTotal: 500 });

  const venda = await chamar('POST', '/admin/balcao/vendas', { corpo: { itens: [{ produtoVariacaoId: kimonoM.id, quantidade: 2 }], formaPagamento: 'dinheiro' } });
  assert.equal(venda.status, 400);
  assert.match(venda.dados.error, /disponível 1/);
  assert.equal((await chamar('POST', '/admin/balcao/vendas', { corpo: { itens: [{ produtoVariacaoId: kimonoG.id, quantidade: 1 }], formaPagamento: 'dinheiro' } })).status, 400);

  await encomenda.update({ situacao: 'E' });
});

test('balcão: venda usa o preço do cadastro, baixa o estoque e entra no caixa já paga', async () => {
  const venda = await chamar('POST', '/admin/balcao/vendas', {
    corpo: { itens: [{ produtoVariacaoId: faixa.id, quantidade: 2, valorUnitario: 1 }, { produtoVariacaoId: semControle.id, quantidade: 1 }], formaPagamento: 'dinheiro', valorDesconto: 10 },
  });
  assert.equal(venda.status, 201);
  assert.equal(venda.dados.valorTotal, 90); // 2×30 + 40 − 10 (o valorUnitario enviado é ignorado)

  assert.equal((await faixa.reload()).quantidadeEstoque, 8);
  const pedido = await models.Pedido.findByPk(venda.dados.id);
  assert.equal(pedido.canal, 'balcao');
  assert.equal(pedido.situacao, 'F');
  const lancamento = await models.Lancamento.findOne({ where: { origem: 'pedido', origemId: pedido.id } });
  assert.equal(lancamento.status, 'pago');
  assert.equal(lancamento.contaFinanceiraId, caixa.id);

  const dia = (await chamar('GET', '/admin/balcao/vendas-do-dia')).dados;
  assert.equal(dia.porForma.dinheiro, 90);
  assert.equal((await chamar('POST', '/admin/balcao/vendas', { corpo: { itens: [{ produtoVariacaoId: faixa.id, quantidade: 1 }], formaPagamento: 'dinheiro', valorDesconto: 999 } })).status, 400);
  assert.equal((await chamar('POST', '/admin/balcao/vendas', { corpo: { itens: [{ produtoVariacaoId: faixa.id, quantidade: 1 }] } })).status, 400);
});

test('reposição: lista abaixo do mínimo, desconta o que está a caminho e gera o pedido de compra', async () => {
  await chamar('POST', '/admin/balcao/vendas', { corpo: { itens: [{ produtoVariacaoId: faixa.id, quantidade: 5 }], formaPagamento: 'dinheiro' } }); // faixa: 8 -> 3 (mínimo 4)
  let lista = (await chamar('GET', '/admin/estoque/reposicao')).dados;
  const linhaFaixa = lista.find((linha) => linha.id === faixa.id);
  assert.equal(linhaFaixa.sugestao, 5); // ideal = 2×4 = 8; 8 − 3
  assert.ok(!lista.find((linha) => linha.id === kimonoM.id), 'kimono M (3, mínimo 2) não precisa');

  const compra = await chamar('POST', '/admin/estoque/reposicao/pedido-compra', { corpo: { fornecedorId: fornecedor.id, itens: [{ produtoVariacaoId: faixa.id, quantidade: 5 }] } });
  assert.equal(compra.status, 201);
  assert.equal(compra.dados.valorTotal, 50);

  lista = (await chamar('GET', '/admin/estoque/reposicao')).dados;
  const depois = lista.find((linha) => linha.id === faixa.id);
  assert.equal(depois.aCaminho, 5);
  assert.equal(depois.sugestao, 0);
  assert.equal((await chamar('POST', '/admin/estoque/reposicao/pedido-compra', { corpo: { itens: [{ produtoVariacaoId: faixa.id, quantidade: 1 }] } })).status, 400);
});

test('inventário: ajusta pra mais e pra menos, ignora o que não foi contado e registra', async () => {
  const contagem = (await chamar('GET', '/admin/estoque/inventario')).dados;
  assert.ok(!contagem.find((linha) => linha.id === semControle.id), 'produto sem controle de estoque fica de fora');

  const resposta = await chamar('POST', '/admin/estoque/inventario', {
    corpo: {
      motivo: 'Contagem de teste',
      itens: [
        { produtoVariacaoId: kimonoM.id, contado: 2 }, // registrado 3 → −1
        { produtoVariacaoId: kimonoG.id, contado: 4 }, // registrado 0 → +4
        { produtoVariacaoId: faixa.id, contado: '' }, // não contado
      ],
    },
  });
  assert.equal(resposta.status, 201);
  assert.equal(resposta.dados.itensContados, 2);
  assert.equal(resposta.dados.itensAjustados, 2);
  assert.equal(Number(resposta.dados.valorDiferenca), 300); // (−1 + 4) × 100
  assert.equal((await kimonoM.reload()).quantidadeEstoque, 2);
  assert.equal((await kimonoG.reload()).quantidadeEstoque, 4);
  const movimento = await models.EstoqueMovimentacao.findOne({ where: { documentoOrigem: `Inventário #${resposta.dados.id}`, produtoVariacaoId: kimonoM.id } });
  assert.equal(movimento.tipoMovimentacao, 'S');
  assert.equal((await chamar('POST', '/admin/estoque/inventario', { corpo: { itens: [{ produtoVariacaoId: faixa.id, contado: -1 }] } })).status, 400);
});

test('painel e planilha de estoque valorizado', async () => {
  const painel = (await chamar('GET', '/admin/estoque/painel')).dados;
  assert.ok(painel.valorCusto > 0);
  assert.equal(painel.maisVendidos[0].codigo, 'VAR-FX');
  assert.ok(painel.abaixoDoMinimo >= 1);
  assert.equal((await chamar('GET', '/admin/relatorios/estoque')).status, 200);
  assert.equal((await chamar('GET', '/admin/relatorios/vendas-produtos')).status, 200);
  assert.ok((await chamar('GET', '/admin/dashboard')).dados.estoqueBaixo >= 1);
});

test('loja: vitrine, pedido reserva estoque, Pix confirmado pelo webhook e não pago é cancelado', async () => {
  const unidadeId = (await models.Unidade.findOne()).id;
  await chamar('POST', '/admin/alunos', { corpo: { nome: 'Filho', unidadeId, responsavelNovo: { nome: 'Mãe Loja', email: 'mae@loja.test' } } });
  const portal = token({ perfil: 'portal', email: 'mae@loja.test' });

  const vitrine = (await chamar('GET', '/portal/loja', { token: portal })).dados;
  assert.deepEqual(vitrine.map((produto) => produto.descricao), ['Kimono']); // só o marcado pra loja

  assert.equal((await chamar('POST', '/portal/loja/pedidos', { token: portal, corpo: { itens: [{ produtoVariacaoId: kimonoM.id, quantidade: 3 }] } })).status, 400);
  assert.equal((await chamar('POST', '/portal/loja/pedidos', { token: portal, corpo: { itens: [{ produtoVariacaoId: faixa.id, quantidade: 1 }] } })).status, 400); // faixa não está na loja
  const compra = await chamar('POST', '/portal/loja/pedidos', { token: portal, corpo: { itens: [{ produtoVariacaoId: kimonoM.id, quantidade: 2 }] } });
  assert.equal(compra.status, 201);
  assert.equal(compra.dados.total, 500);

  // Reservado: o balcão não consegue vender o kimono M (2 em estoque, 2 reservados).
  assert.equal((await chamar('POST', '/admin/balcao/vendas', { corpo: { itens: [{ produtoVariacaoId: kimonoM.id, quantidade: 1 }], formaPagamento: 'dinheiro' } })).status, 400);

  const tokenPagamento = compra.dados.link.split('/').pop();
  const pagamento = await chamar('GET', `/loja/pedidos/${tokenPagamento}`, { token: null });
  assert.equal(pagamento.dados.situacao, 'aguardando');
  assert.ok(pagamento.dados.pixCopiaCola);

  ajuda.mercadoPagoService.consultarPagamento = async () => ({ statusPagamento: 'pago', statusMp: 'approved', referenciaExterna: `PED${compra.dados.id}`, valor: 500, aprovadoEm: new Date().toISOString() });
  await chamar('POST', '/webhooks/mercadopago', { token: null, corpo: { type: 'payment', data: { id: '901' } } });
  assert.equal((await chamar('GET', `/loja/pedidos/${tokenPagamento}/status`, { token: null })).dados.situacao, 'pago');
  assert.ok(emails.some((email) => email.funcao === 'enviarPedidoLojaPago' && email.destinatario === 'mae@loja.test'));
  const meus = (await chamar('GET', '/portal/loja/pedidos', { token: portal })).dados;
  assert.equal(meus[0].situacao, 'pago');

  // Outro pedido, não pago, passa do prazo: cancelado e o estoque volta a ficar disponível.
  const outro = await chamar('POST', '/portal/loja/pedidos', { token: portal, corpo: { itens: [{ produtoVariacaoId: kimonoG.id, quantidade: 4 }] } });
  assert.equal(outro.status, 201);
  await models.Pedido.update({ createdAt: new Date(Date.now() - 49 * 60 * 60 * 1000) }, { where: { id: outro.dados.id }, silent: true });
  const { cancelarNaoPagos } = require('../src/services/lojaService');
  ajuda.mercadoPagoService.consultarPagamento = async () => ({ statusPagamento: 'pendente', statusMp: 'pending', referenciaExterna: `PED${outro.dados.id}` });
  assert.equal(await cancelarNaoPagos(), 1);
  assert.equal((await models.Pedido.findByPk(outro.dados.id)).situacao, 'E');
  assert.equal((await chamar('POST', '/admin/balcao/vendas', { corpo: { itens: [{ produtoVariacaoId: kimonoG.id, quantidade: 1 }], formaPagamento: 'dinheiro' } })).status, 201);
});

test('recepção vende no balcão e entrega pedidos, mas não mexe em estoque/compras/inventário', async () => {
  const recepcao = token({ id: 88, perfil: 'recepcao' });
  assert.equal((await chamar('GET', '/admin/balcao/produtos?busca=faixa', { token: recepcao })).status, 200);
  assert.equal((await chamar('GET', '/admin/pedidos', { token: recepcao })).status, 200);
  for (const caminho of ['/admin/estoque/reposicao', '/admin/estoque/inventario', '/admin/estoque/painel', '/admin/relatorios/estoque']) {
    assert.equal((await chamar('GET', caminho, { token: recepcao })).status, 403, caminho);
  }
});
