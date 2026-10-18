const ajuda = require('./ajuda');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { chamar, models } = ajuda;
const { aplicarAjustesIniciais } = require('../src/config/ajustesIniciais');

let unidadeId;

before(async () => {
  await ajuda.iniciar();
  unidadeId = (await models.Unidade.findOne()).id;
});
after(ajuda.encerrar);

test('migração única: turmas antigas viram academias externas e seus alunos viram externos', async () => {
  const professor = await models.Instrutor.create({ nome: 'Sensei Externo', email: 'sensei@externo.test' });
  const turmaAcademia = await models.Turma.create({ nome: 'Academia do Sensei', modalidade: 'J', diaSemana: 'Segunda', horaInicio: '18:00', horaFim: '19:00', instrutorId: professor.id, unidadeId });
  const turmaReal = await models.Turma.create({ nome: 'Kids Sanryu', modalidade: 'J', diaSemana: 'Terça', horaInicio: '18:00', horaFim: '19:00', unidadeId });
  await models.Aula.create({ turmaId: turmaReal.id, data: '2026-10-01' });

  const externo = await models.Aluno.create({ nome: 'Aluno do Sensei', unidadeId });
  const comContrato = await models.Aluno.create({ nome: 'Já é do Dojo', unidadeId });
  const daTurmaReal = await models.Aluno.create({ nome: 'Da Turma Real', unidadeId });
  const soltoDeEvento = await models.Aluno.create({ nome: 'Veio de Evento', unidadeId });
  await models.Matricula.create({ alunoId: externo.id, turmaId: turmaAcademia.id });
  await models.Matricula.create({ alunoId: comContrato.id, turmaId: turmaAcademia.id });
  await models.Matricula.create({ alunoId: daTurmaReal.id, turmaId: turmaReal.id });
  const plano = await models.Plano.create({ nome: 'P', periodicidade: 'mensal', valor: 100 });
  await models.Contrato.create({ alunoId: comContrato.id, planoId: plano.id, dataInicio: '2026-10-01', diaVencimento: 10, valorPlano: 100, valorFinal: 100, tokenAssinatura: 'tk-migracao' });

  // Simula o banco de antes da migração e sobe de novo.
  await models.ConfiguracaoAcademia.update({ turmasMigradasEm: null }, { where: {} });
  await aplicarAjustesIniciais();

  const academia = await models.Academia.findOne({ where: { turmaOrigemId: turmaAcademia.id } });
  assert.ok(academia, 'turma antiga virou academia');
  assert.equal(academia.instrutorId, professor.id);
  assert.equal(await models.Turma.findByPk(turmaAcademia.id), null, 'turma antiga saiu das turmas');
  assert.ok(await models.Turma.findByPk(turmaReal.id), 'turma com chamada é preservada');

  await externo.reload();
  assert.equal(externo.vinculo, 'externo');
  assert.equal(externo.academiaId, academia.id);
  assert.equal(externo.unidadeId, null);

  assert.equal((await comContrato.reload()).vinculo, 'academia');
  assert.equal((await daTurmaReal.reload()).vinculo, 'academia');
  await soltoDeEvento.reload();
  assert.equal(soltoDeEvento.vinculo, 'externo');
  assert.equal(soltoDeEvento.unidadeId, null, 'externo não recebe a unidade do dojo');

  // Rodar de novo não converte as turmas novas.
  const turmaNova = await models.Turma.create({ nome: 'Adulto Sanryu', modalidade: 'J', diaSemana: 'Quarta', horaInicio: '20:00', horaFim: '21:00', unidadeId });
  await aplicarAjustesIniciais();
  assert.ok(await models.Turma.findByPk(turmaNova.id));
  assert.equal(await models.Academia.count(), 1);
});

test('listagem separa alunos do dojo e externos; contagens do dashboard ignoram externos', async () => {
  const doDojo = (await chamar('GET', '/admin/alunos?vinculo=academia')).dados.map((aluno) => aluno.nome);
  const externos = (await chamar('GET', '/admin/alunos?vinculo=externo')).dados.map((aluno) => aluno.nome);
  assert.ok(doDojo.includes('Já é do Dojo') && !doDojo.includes('Aluno do Sensei'));
  assert.ok(externos.includes('Aluno do Sensei') && externos.includes('Veio de Evento'));

  const dashboard = (await chamar('GET', '/admin/dashboard')).dados;
  assert.equal(dashboard.alunosAtivos, doDojo.length);
});

test('externo não faz contrato até virar aluno da academia', async () => {
  const externo = await models.Aluno.findOne({ where: { nome: 'Aluno do Sensei' } });
  const plano = (await chamar('POST', '/admin/planos', { corpo: { nome: 'Mensal', periodicidade: 'mensal', valor: 150, ativo: true } })).dados;
  assert.equal((await chamar('POST', '/admin/contratos', { corpo: { alunoId: externo.id, planoId: plano.id, diaVencimento: 10 } })).status, 400);

  await chamar('PUT', `/admin/alunos/${externo.id}`, { corpo: { vinculo: 'academia', academiaId: null, unidadeId } });
  assert.equal((await chamar('POST', '/admin/contratos', { corpo: { alunoId: externo.id, planoId: plano.id, diaVencimento: 10 } })).status, 201);
});

test('academias: CRUD e não exclui com alunos', async () => {
  const criada = await chamar('POST', '/admin/academias', { corpo: { nome: 'Academia Nova', cidade: 'Campinas' } });
  assert.equal(criada.status, 201);
  const lista = (await chamar('GET', '/admin/academias')).dados;
  assert.ok(lista.find((academia) => academia.nome === 'Academia Nova'));

  const comAlunos = lista.find((academia) => academia.totalAlunos > 0);
  if (comAlunos) assert.equal((await chamar('DELETE', `/admin/academias/${comAlunos.id}`)).status, 400);
  assert.equal((await chamar('DELETE', `/admin/academias/${criada.dados.id}`)).status, 204);
});

test('inscrito de evento vira aluno externo da academia escolhida', async () => {
  const academia = await models.Academia.findOne();
  const tipo = await models.TipoEvento.create({ nome: 'Exame de Faixa' });
  const evento = await models.Evento.create({ nome: 'Exame', tipoEventoId: tipo.id, data: new Date(), publicado: true });
  const inscricao = await models.EventoAluno.create({ eventoId: evento.id, email: 'Novo@Externo.test', nome: 'Novo Externo', faixa: 'Amarela', tamanhoFaixa: 'M2' });

  const resposta = await chamar('POST', `/admin/inscricoes/${inscricao.id}/cadastrar-aluno`, { corpo: { academiaId: academia.id } });
  assert.equal(resposta.status, 200);
  const aluno = await models.Aluno.findByPk(resposta.dados.aluno.id);
  assert.equal(aluno.vinculo, 'externo');
  assert.equal(aluno.academiaId, academia.id);
  assert.equal(aluno.email, 'novo@externo.test');
});
