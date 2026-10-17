const ajuda = require('./ajuda');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { chamar, models, emails, token } = ajuda;

let turma;
let tokenSensei;

before(async () => {
  await ajuda.iniciar();
  const unidadeId = (await models.Unidade.findOne()).id;
  const sensei = (await chamar('POST', '/admin/instrutores', { corpo: { nome: 'Sensei' } })).dados;
  // Todo dia: sempre há data disponível nos próximos dias, independente de quando o teste roda.
  turma = (await chamar('POST', '/admin/turmas', { corpo: { nome: 'Kids', modalidade: 'J', diaSemana: 'Domingo,Segunda,Terça,Quarta,Quinta,Sexta,Sábado', horaInicio: '23:58', horaFim: '23:59', instrutorId: sensei.id, unidadeId } })).dados;
  tokenSensei = token({ id: 50, perfil: 'instrutor', instrutorId: sensei.id });
});
after(ajuda.encerrar);

async function opcoes() {
  return (await chamar('GET', '/aula-experimental/opcoes', { token: null })).dados;
}

const BASE = { nome: 'Joãozinho', telefone: '(11) 98888-7777', aceiteContato: true };

test('opções mostram a turma com os próximos dias', async () => {
  const lista = await opcoes();
  const kids = lista.find((item) => item.id === turma.id);
  assert.ok(kids.datas.length >= 14);
});

test('validações do formulário público', async () => {
  assert.equal((await chamar('POST', '/aula-experimental', { token: null, corpo: { ...BASE, aceiteContato: false } })).status, 400);
  assert.equal((await chamar('POST', '/aula-experimental', { token: null, corpo: { ...BASE, telefone: '1234' } })).status, 400);
  const menorSemResponsavel = await chamar('POST', '/aula-experimental', { token: null, corpo: { ...BASE, dataNascimento: '2018-01-01' } });
  assert.equal(menorSemResponsavel.status, 400);
  const diaInvalido = await chamar('POST', '/aula-experimental', { token: null, corpo: { ...BASE, turmaId: turma.id, dataAula: '2000-01-01' } });
  assert.equal(diaInvalido.status, 400);
});

test('robô que preenche o campo escondido não cria nada', async () => {
  const antes = await models.Lead.count();
  const resposta = await chamar('POST', '/aula-experimental', { token: null, corpo: { ...BASE, site: 'http://spam' } });
  assert.equal(resposta.status, 200);
  assert.equal(await models.Lead.count(), antes);
});

let lead;

test('agendar cria interessado "agendado", manda confirmação e não duplica no clique duplo', async () => {
  const dataAula = (await opcoes()).find((item) => item.id === turma.id).datas[1];
  const corpo = { ...BASE, email: 'Pai@Teste.test', dataNascimento: '2017-03-03', nomeResponsavel: 'Pai', turmaId: turma.id, dataAula, origem: 'instagram' };
  const antes = emails.length;

  assert.equal((await chamar('POST', '/aula-experimental', { token: null, corpo })).status, 201);
  assert.equal((await chamar('POST', '/aula-experimental', { token: null, corpo })).status, 200);
  assert.equal(await models.Lead.count({ where: { telefone: BASE.telefone, dataAula } }), 1);

  lead = await models.Lead.findOne({ where: { telefone: BASE.telefone, dataAula } });
  assert.equal(lead.status, 'agendado');
  assert.equal(lead.email, 'pai@teste.test');
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.ok(emails.slice(antes).some((email) => email.funcao === 'enviarAulaExperimental' && email.destinatario === 'pai@teste.test'));
});

test('experimental aparece na chamada do dia e marcar presença vira "compareceu"', async () => {
  // A aula é amanhã ou depois: o sensei só faz chamada até hoje, então move a aula pra hoje.
  const hoje = ajuda.hoje();
  await lead.update({ dataAula: hoje });
  const chamada = (await chamar('GET', `/sensei/turmas/${turma.id}/chamada?data=${hoje}`, { token: tokenSensei })).dados;
  assert.deepEqual(chamada.experimentais.map((item) => item.nome), ['Joãozinho']);

  await chamar('PUT', `/sensei/turmas/${turma.id}/chamada`, { token: tokenSensei, corpo: { data: hoje, presentes: [], experimentaisPresentes: [lead.id] } });
  assert.equal((await lead.reload()).status, 'compareceu');

  await chamar('PUT', `/sensei/turmas/${turma.id}/chamada`, { token: tokenSensei, corpo: { data: hoje, presentes: [], experimentaisPresentes: [] } });
  assert.equal((await lead.reload()).status, 'agendado');
});

test('não marca "matriculado" sem converter; converter cria aluno, responsável e matrícula', async () => {
  assert.equal((await chamar('PUT', `/admin/leads/${lead.id}`, { corpo: { status: 'matriculado' } })).status, 400);

  const convertido = await chamar('POST', `/admin/leads/${lead.id}/converter`);
  assert.equal(convertido.status, 200);
  const aluno = await models.Aluno.findByPk(convertido.dados.alunoId, { include: ['responsavel', 'turmas'] });
  assert.equal(aluno.nome, 'Joãozinho');
  assert.equal(aluno.responsavel.nome, 'Pai');
  assert.equal(aluno.responsavel.telefone, BASE.telefone);
  assert.deepEqual(aluno.turmas.map((item) => item.id), [turma.id]);
  assert.equal((await lead.reload()).status, 'matriculado');

  assert.equal((await chamar('POST', `/admin/leads/${lead.id}/converter`)).status, 400);
});

test('lembrete da véspera sai uma vez só', async () => {
  const leadService = require('../src/services/leadService');
  const amanha = ajuda.somarDias(ajuda.hoje(), 1);
  await models.Lead.create({ nome: 'Lembrar', telefone: '11977776666', email: 'lembra@teste.test', turmaId: turma.id, dataAula: amanha, status: 'agendado' });
  assert.equal(await leadService.enviarLembretes(), 1);
  assert.equal(await leadService.enviarLembretes(), 0);
});

test('lista do admin traz a contagem por situação', async () => {
  const resposta = (await chamar('GET', '/admin/leads')).dados;
  assert.equal(resposta.contagem.matriculado, 1);
  assert.ok(resposta.contagem.agendado >= 1);
});
