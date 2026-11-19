const ajuda = require('./ajuda');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { chamar, models, emails } = ajuda;
const gatameService = require('../src/services/gatameService');
const mercadoPagoService = require('../src/services/mercadoPagoService');

// Gatame simulado: a pessoa existe com faixa Amarela e SEM carteirinha válida (paga, não efetivada).
const pessoas = {
  'joao@sanryu.test': [{ nome: 'João Silva', faixa: 'Amarela', numero_carteirinha: null, validade_carteirinha: null, tamanho_faixa: 'A2', origem: 'gatame', email: 'joao@sanryu.test' }],
  'irmaos@sanryu.test': [
    { nome: 'Ana Souza', faixa: 'Amarela', origem: 'gatame', tamanho_faixa: 'M2', email: 'irmaos@sanryu.test' },
    { nome: 'Bia Souza', faixa: 'Amarela', origem: 'gatame', tamanho_faixa: 'M1', email: 'irmaos@sanryu.test' },
  ],
};
gatameService.consultarAluno = async (email) => {
  const candidatos = pessoas[email.toLowerCase()];
  return candidatos ? { apto: true, candidatos } : { apto: false, candidatos: [] };
};

let evento;
const cancelados = [];

before(async () => {
  await ajuda.iniciar();
  mercadoPagoService.cancelarPagamento = async (id) => {
    cancelados.push(id);
    return {};
  };
  // Tipo 1 = Exame de Faixa (valor pela faixa de destino, com/sem carteirinha).
  const tipo = await models.TipoEvento.create({ id: 1, nome: 'Exame de Faixa', cobravel: true });
  await models.Faixa.create({ nome: 'Amarela', cor: 'amarela', ordem: 1, ativo: true });
  await models.Faixa.create({ nome: 'Laranja', cor: 'laranja', ordem: 2, ativo: true, valorComCarteirinha: 80, valorSemCarteirinha: 150 });
  evento = await models.Evento.create({ nome: 'Exame Céu', data: new Date(), tipoEventoId: tipo.id, publicado: true });
});

after(async () => {
  await ajuda.encerrar();
});

async function inscrever(email, indice = 0) {
  return chamar('POST', `/eventos/${evento.id}/inscricoes`, { corpo: { email, indice }, token: null });
}

test('valor especial cadastrado antes da inscrição é usado no lugar do valor sem carteirinha', async () => {
  const criado = await chamar('POST', `/admin/eventos/${evento.id}/descontos`, {
    corpo: { email: ' JOAO@sanryu.test ', valor: 80, motivo: 'Pagou a carteirinha, não foi efetivada', carteirinhaPendente: true },
  });
  assert.equal(criado.status, 201);
  assert.equal(criado.dados.eventoAlunoId, null, 'ainda não inscrito');

  const inscricao = await inscrever('joao@sanryu.test');
  assert.equal(inscricao.status, 201);
  assert.equal(Number(inscricao.dados.valorCobrado), 80);
  assert.equal(Number(inscricao.dados.valorOriginal), 150, 'guarda o valor da regra pra mostrar a diferença');
  assert.equal(inscricao.dados.carteirinhaValida, false, 'continua marcado como sem carteirinha');

  const [desconto] = (await chamar('GET', `/admin/eventos/${evento.id}/descontos`)).dados;
  assert.equal(desconto.eventoAlunoId, inscricao.dados.id);
  assert.equal(desconto.inscricao.nome, 'João Silva');

  // Aplicado: não dá mais pra excluir; carteirinha marca como enviada.
  assert.equal((await chamar('DELETE', `/admin/eventos/${evento.id}/descontos/${desconto.id}`)).status, 400);
  const enviada = await chamar('PUT', `/admin/eventos/${evento.id}/descontos/${desconto.id}/carteirinha`, { corpo: { enviada: true } });
  assert.ok(enviada.dados.carteirinhaEnviadaEm);
});

test('valor especial para quem já se inscreveu troca o valor e o Pix na hora; irmãos precisam do nome', async () => {
  const ana = await inscrever('irmaos@sanryu.test', 0);
  const bia = await inscrever('irmaos@sanryu.test', 1);
  assert.equal(Number(ana.dados.valorCobrado), 150);
  await models.EventoAluno.update({ mpPaymentId: 'MP-ANTIGO' }, { where: { id: ana.dados.id } });

  // Mesmo e-mail pras duas: sem nome não sabe qual.
  assert.equal((await chamar('POST', `/admin/eventos/${evento.id}/descontos`, { corpo: { email: 'irmaos@sanryu.test', valor: 0 } })).status, 400);

  const antes = emails.length;
  const criado = await chamar('POST', `/admin/eventos/${evento.id}/descontos`, { corpo: { email: 'irmaos@sanryu.test', nome: 'ana souza', valor: 0 } });
  assert.equal(criado.status, 201);

  const anaDepois = await models.EventoAluno.findByPk(ana.dados.id);
  assert.equal(Number(anaDepois.valorCobrado), 0);
  assert.equal(Number(anaDepois.valorOriginal), 150);
  assert.equal(anaDepois.statusPagamento, 'pago', 'isenta: já fica paga');
  assert.ok(cancelados.includes('MP-ANTIGO'), 'cancela o Pix antigo');
  assert.ok(emails.length > antes, 'reenvia a confirmação');

  const biaDepois = await models.EventoAluno.findByPk(bia.dados.id);
  assert.equal(Number(biaDepois.valorCobrado), 150, 'a irmã não muda');
});

test('não aplica em inscrição já paga, não repete e valida os dados', async () => {
  pessoas['paga@sanryu.test'] = [{ nome: 'Carla', faixa: 'Amarela', origem: 'gatame', tamanho_faixa: 'A1', email: 'paga@sanryu.test' }];
  const paga = await inscrever('paga@sanryu.test');
  await models.EventoAluno.update({ statusPagamento: 'pago' }, { where: { id: paga.dados.id } });

  assert.equal((await chamar('POST', `/admin/eventos/${evento.id}/descontos`, { corpo: { email: 'paga@sanryu.test', valor: 80 } })).status, 400);
  assert.equal((await chamar('POST', `/admin/eventos/${evento.id}/descontos`, { corpo: { email: 'sem-arroba', valor: 80 } })).status, 400);
  assert.equal((await chamar('POST', `/admin/eventos/${evento.id}/descontos`, { corpo: { email: 'novo@sanryu.test', valor: -1 } })).status, 400);

  const novo = await chamar('POST', `/admin/eventos/${evento.id}/descontos`, { corpo: { email: 'novo@sanryu.test', valor: 50 } });
  assert.equal(novo.status, 201);
  assert.equal((await chamar('POST', `/admin/eventos/${evento.id}/descontos`, { corpo: { email: 'novo@sanryu.test', valor: 40 } })).status, 400, 'repetido');
  assert.equal((await chamar('DELETE', `/admin/eventos/${evento.id}/descontos/${novo.dados.id}`)).status, 204, 'não usado: pode excluir');
});
