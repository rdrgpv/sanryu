const ajuda = require('./ajuda');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { chamar, models, token, hoje, somarDias } = ajuda;

let tokenSensei;
let turmaDele;
let turmaOutro;
let ana;
let bruno;
let foraDaTurma;

before(async () => {
  await ajuda.iniciar();
  const unidadeId = (await models.Unidade.findOne()).id;
  const sensei = (await chamar('POST', '/admin/instrutores', { corpo: { nome: 'Sensei' } })).dados;
  const outro = (await chamar('POST', '/admin/instrutores', { corpo: { nome: 'Outro' } })).dados;
  turmaDele = (await chamar('POST', '/admin/turmas', { corpo: { nome: 'Kids', modalidade: 'J', diaSemana: 'Segunda,Quarta', horaInicio: '18:00', horaFim: '19:00', instrutorId: sensei.id, unidadeId } })).dados;
  turmaOutro = (await chamar('POST', '/admin/turmas', { corpo: { nome: 'Adulto', modalidade: 'J', diaSemana: 'Terça', horaInicio: '20:00', horaFim: '21:00', instrutorId: outro.id, unidadeId } })).dados;
  ana = (await chamar('POST', '/admin/alunos', { corpo: { nome: 'Ana', unidadeId, restricoesMedicas: 'Joelho' } })).dados;
  bruno = (await chamar('POST', '/admin/alunos', { corpo: { nome: 'Bruno', unidadeId } })).dados;
  const trancado = (await chamar('POST', '/admin/alunos', { corpo: { nome: 'Trancado', unidadeId, situacao: 'trancado' } })).dados;
  foraDaTurma = (await chamar('POST', '/admin/alunos', { corpo: { nome: 'Fora', unidadeId } })).dados;
  for (const aluno of [ana, bruno, trancado]) await chamar('POST', `/admin/alunos/${aluno.id}/matricular`, { corpo: { turmaId: turmaDele.id } });

  await chamar('POST', `/admin/instrutores/${sensei.id}/acesso`, { corpo: { username: 'sensei', senha: 'senha-forte-123' } });
  const login = await chamar('POST', '/auth/login', { token: null, corpo: { username: 'sensei', password: 'senha-forte-123' } });
  tokenSensei = login.dados.token;
});
after(ajuda.encerrar);

test('sensei vê só as próprias turmas e não abre a do outro', async () => {
  const turmas = (await chamar('GET', '/sensei/turmas', { token: tokenSensei })).dados;
  assert.deepEqual(turmas.map((turma) => turma.nome), ['Kids']);
  assert.equal((await chamar('GET', `/sensei/turmas/${turmaOutro.id}/chamada`, { token: tokenSensei })).status, 403);
});

test('chamada lista só ativos matriculados, com aviso de saúde, sem dado financeiro', async () => {
  const chamada = (await chamar('GET', `/sensei/turmas/${turmaDele.id}/chamada`, { token: tokenSensei })).dados;
  assert.deepEqual(chamada.alunos.map((aluno) => aluno.nome), ['Ana', 'Bruno']);
  assert.equal(chamada.alunos[0].atencaoSaude, 'Joelho');
  assert.ok(!/valor|R\$/.test(JSON.stringify(chamada)));
});

test('não aceita dia futuro nem aluno de fora da turma', async () => {
  assert.equal((await chamar('GET', `/sensei/turmas/${turmaDele.id}/chamada?data=${somarDias(hoje(), 1)}`, { token: tokenSensei })).status, 400);
  assert.equal((await chamar('PUT', `/sensei/turmas/${turmaDele.id}/chamada`, { token: tokenSensei, corpo: { data: hoje(), presentes: [foraDaTurma.id] } })).status, 400);
});

test('salvar e corrigir a chamada; aula sem ninguém conta na frequência', async () => {
  const caminho = `/sensei/turmas/${turmaDele.id}/chamada`;
  await chamar('PUT', caminho, { token: tokenSensei, corpo: { data: hoje(), presentes: [ana.id, bruno.id] } });
  await chamar('PUT', caminho, { token: tokenSensei, corpo: { data: hoje(), presentes: [bruno.id] } });
  const relida = (await chamar('GET', caminho, { token: tokenSensei })).dados;
  assert.deepEqual(relida.alunos.filter((aluno) => aluno.presente).map((aluno) => aluno.nome), ['Bruno']);

  const ontem = somarDias(hoje(), -1);
  await chamar('PUT', caminho, { token: tokenSensei, corpo: { data: ontem, presentes: [] } });

  const frequencia = (await chamar('GET', `/admin/frequencia?inicio=${ontem}&fim=${hoje()}`)).dados.alunos;
  const linhaBruno = frequencia.find((linha) => linha.nome === 'Bruno');
  const linhaAna = frequencia.find((linha) => linha.nome === 'Ana');
  assert.equal(linhaBruno.aulas, 2);
  assert.equal(linhaBruno.presencas, 1);
  assert.equal(linhaAna.percentual, 0);
});

test('mensalidade vencida aparece só como aviso', async () => {
  const plano = (await chamar('POST', '/admin/planos', { corpo: { nome: 'P', periodicidade: 'mensal', valor: 100, ativo: true } })).dados;
  await chamar('POST', '/admin/contratos', { corpo: { alunoId: bruno.id, planoId: plano.id, diaVencimento: 1, dataInicio: somarDias(hoje(), -60) } });
  await chamar('POST', '/admin/mensalidades/gerar');
  // Cobrança "antiga" (gerada antes do vencimento) pra contar como vencida.
  await models.Mensalidade.update({ createdAt: new Date('2000-01-01') }, { where: { alunoId: bruno.id }, silent: true });
  const chamada = (await chamar('GET', `/sensei/turmas/${turmaDele.id}/chamada`, { token: tokenSensei })).dados;
  assert.equal(chamada.alunos.find((aluno) => aluno.nome === 'Bruno').mensalidadeEmAtraso, true);
  assert.equal(chamada.alunos.find((aluno) => aluno.nome === 'Ana').mensalidadeEmAtraso, false);
});
