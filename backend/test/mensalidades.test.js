const ajuda = require('./ajuda');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { chamar, models, hoje, somarDias } = ajuda;
const mensalidadeService = require('../src/services/mensalidadeService');

let unidadeId;
let plano;

before(async () => {
  await ajuda.iniciar();
  ({ unidadeId, plano } = await ajuda.criarUnidadeEPlano({ valor: 200 }));
});
after(ajuda.encerrar);

async function alunoComContrato(nome, { dataInicio, diaVencimento = 10, planoId = plano.id } = {}) {
  const aluno = (await chamar('POST', '/admin/alunos', { corpo: { nome, unidadeId, email: `${nome.replace(/\s/g, '').toLowerCase()}@teste.test` } })).dados;
  const contrato = (await chamar('POST', '/admin/contratos', { corpo: { alunoId: aluno.id, planoId, diaVencimento, dataInicio } })).dados;
  return { aluno, contrato };
}

test('primeiro vencimento e soma de meses', () => {
  assert.equal(mensalidadeService.primeiroVencimento('2026-08-15', 10), '2026-09-10');
  assert.equal(mensalidadeService.primeiroVencimento('2026-08-05', 10), '2026-08-10');
  assert.equal(mensalidadeService.somarMeses('2027-01-28', 1), '2027-02-28');
  assert.equal(mensalidadeService.somarMeses('2026-12-10', 3), '2027-03-10');
});

test('geração é idempotente e respeita a periodicidade', async () => {
  const inicio = somarDias(hoje(), -100);
  const { contrato } = await alunoComContrato('Gera Mensal', { dataInicio: inicio });
  const trimestral = (await chamar('POST', '/admin/planos', { corpo: { nome: 'Tri', periodicidade: 'trimestral', valor: 540, ativo: true } })).dados;
  const { contrato: contratoTri } = await alunoComContrato('Gera Trimestral', { dataInicio: inicio, planoId: trimestral.id });

  const primeira = await chamar('POST', '/admin/mensalidades/gerar');
  assert.ok(primeira.dados.geradas > 0);
  assert.equal((await chamar('POST', '/admin/mensalidades/gerar')).dados.geradas, 0);

  const mensais = await models.Mensalidade.count({ where: { contratoId: contrato.id } });
  const trimestrais = await models.Mensalidade.count({ where: { contratoId: contratoTri.id } });
  assert.ok(mensais >= 3, `mensal gerou ${mensais}`);
  assert.ok(trimestrais <= 2, `trimestral gerou ${trimestrais}`);
});

test('multa 2% + juros 1% a.m. pro rata, contando do vencimento', async () => {
  const mensalidade = models.Mensalidade.build({ valor: 200, vencimento: '2026-09-10', createdAt: new Date('2026-09-01T12:00:00Z') });
  const valores = await mensalidadeService.valorAtualizado(mensalidade, '2026-10-17');
  assert.equal(valores.diasAtraso, 37);
  assert.equal(valores.multa, 4);
  assert.equal(valores.juros, 2.47);
  assert.equal(valores.total, 206.47);
});

test('cobrança gerada depois do vencimento: atraso só conta a partir da geração', async () => {
  const mensalidade = models.Mensalidade.build({ valor: 200, vencimento: '2026-08-05', createdAt: new Date('2026-10-17T12:00:00Z') });
  assert.equal((await mensalidadeService.valorAtualizado(mensalidade, '2026-10-17')).total, 200);
});

test('link público gera Pix (estático sem MP), reaproveita no mesmo dia, e baixa manual/reabrir', async () => {
  const { contrato } = await alunoComContrato('Paga Link', { dataInicio: somarDias(hoje(), -40) });
  await chamar('POST', '/admin/mensalidades/gerar');
  const mensalidade = await models.Mensalidade.findOne({ where: { contratoId: contrato.id }, order: [['vencimento', 'ASC']] });

  const primeiro = await chamar('GET', `/mensalidades/${mensalidade.token}`, { token: null });
  assert.equal(primeiro.status, 200);
  assert.ok(primeiro.dados.pixCopiaCola);
  const segundo = await chamar('GET', `/mensalidades/${mensalidade.token}`, { token: null });
  assert.equal(segundo.dados.pixCopiaCola, primeiro.dados.pixCopiaCola);

  assert.equal((await chamar('POST', `/admin/mensalidades/${mensalidade.id}/pagamento`, { corpo: { valorPago: 200 } })).status, 400);
  const baixa = await chamar('POST', `/admin/mensalidades/${mensalidade.id}/pagamento`, { corpo: { valorPago: 200, formaPagamento: 'dinheiro', pagoEm: hoje() } });
  assert.equal(baixa.dados.status, 'pago');
  assert.equal((await chamar('GET', `/mensalidades/${mensalidade.token}/status`, { token: null })).dados.status, 'pago');

  const reaberta = await chamar('POST', `/admin/mensalidades/${mensalidade.id}/reabrir`);
  assert.equal(reaberta.dados.status, 'pendente');
});

test('webhook só dá baixa com o que a API do Mercado Pago confirma', async () => {
  const { contrato } = await alunoComContrato('Paga Webhook', { dataInicio: somarDias(hoje(), -40) });
  await chamar('POST', '/admin/mensalidades/gerar');
  const mensalidade = await models.Mensalidade.findOne({ where: { contratoId: contrato.id } });

  ajuda.mercadoPagoService.consultarPagamento = async (id) => ({
    statusPagamento: id === '777' ? 'pago' : 'pendente',
    statusMp: id === '777' ? 'approved' : 'pending',
    referenciaExterna: `MEN${mensalidade.id}`,
    valor: 200,
    aprovadoEm: new Date().toISOString(),
  });

  // Notificação de um pagamento ainda pendente no MP: não baixa.
  await chamar('POST', '/webhooks/mercadopago', { token: null, corpo: { type: 'payment', data: { id: '555' } } });
  assert.equal((await mensalidade.reload()).status, 'pendente');

  await chamar('POST', '/webhooks/mercadopago?type=payment&data.id=777', { token: null });
  await mensalidade.reload();
  assert.equal(mensalidade.status, 'pago');
  assert.equal(mensalidade.formaPagamento, 'pix');

  // Repetido não quebra.
  assert.equal((await chamar('POST', '/webhooks/mercadopago?type=payment&data.id=777', { token: null })).status, 200);
});

test('bolsa de 100% nasce isenta, sem cobrança', async () => {
  const aluno = (await chamar('POST', '/admin/alunos', { corpo: { nome: 'Isento', unidadeId } })).dados;
  const contrato = (
    await chamar('POST', '/admin/contratos', {
      corpo: { alunoId: aluno.id, planoId: plano.id, diaVencimento: 10, dataInicio: somarDias(hoje(), -40), bolsaPercentual: 100, motivoBolsa: 'Professor' },
    })
  ).dados;
  await chamar('POST', '/admin/mensalidades/gerar');
  const mensalidades = await models.Mensalidade.findAll({ where: { contratoId: contrato.id } });
  assert.ok(mensalidades.length > 0);
  assert.ok(mensalidades.every((item) => item.status === 'pago' && item.formaPagamento === 'isento'));
});

test('encerrar contrato cancela as mensalidades futuras em aberto', async () => {
  const { contrato } = await alunoComContrato('Encerra', { dataInicio: hoje(), diaVencimento: 28 });
  await chamar('POST', '/admin/mensalidades/gerar');
  const antes = await models.Mensalidade.count({ where: { contratoId: contrato.id, status: 'pendente' } });
  const encerrado = await chamar('POST', `/admin/contratos/${contrato.id}/encerrar`, { corpo: { dataFim: hoje() } });
  assert.equal(encerrado.dados.mensalidadesCanceladas, antes);
});
