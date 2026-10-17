const ajuda = require('./ajuda');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { chamar, models, emails } = ajuda;

let filho1;
let filho2;
let cancelado;
let deOutraFamilia;

before(async () => {
  await ajuda.iniciar();
  const unidadeId = (await models.Unidade.findOne()).id;
  filho1 = (await chamar('POST', '/admin/alunos', { corpo: { nome: 'Filho Um', unidadeId, responsavelNovo: { nome: 'Mãe', email: 'mae@familia.test' } } })).dados;
  filho2 = (await chamar('POST', '/admin/alunos', { corpo: { nome: 'Filho Dois', unidadeId, responsavelId: filho1.responsavelId } })).dados;
  cancelado = (await chamar('POST', '/admin/alunos', { corpo: { nome: 'Cancelado', unidadeId, responsavelId: filho1.responsavelId, situacao: 'cancelado' } })).dados;
  deOutraFamilia = (await chamar('POST', '/admin/alunos', { corpo: { nome: 'Adulto', unidadeId, email: 'adulto@teste.test' } })).dados;
  // Cadastro antigo com maiúsculas (antes da normalização).
  await models.sequelize.query("UPDATE Responsavels SET email = 'Mae@Familia.TEST'");
});
after(ajuda.encerrar);

function ultimoCodigo() {
  return [...emails].reverse().find((email) => email.funcao === 'enviarCodigoAcesso')?.codigo;
}

test('e-mail desconhecido recebe a mesma resposta e nenhum código', async () => {
  const antes = emails.length;
  const resposta = await chamar('POST', '/portal/codigo', { token: null, corpo: { email: 'ninguem@x.test' } });
  assert.equal(resposta.status, 200);
  assert.equal(emails.length, antes);
});

let tokenPortal;

test('login por código: maiúsculas, código errado, certo, uso único e limite de envio', async () => {
  await chamar('POST', '/portal/codigo', { token: null, corpo: { email: 'MAE@familia.test' } });
  const codigo = ultimoCodigo();
  assert.match(codigo, /^\d{6}$/);
  assert.equal(await models.CodigoAcesso.count({ where: { codigoHash: codigo } }), 0, 'código não pode ficar em texto puro');

  assert.equal((await chamar('POST', '/portal/codigo', { token: null, corpo: { email: 'mae@familia.test' } })).status, 429);

  const errado = codigo === '000000' ? '111111' : '000000';
  assert.equal((await chamar('POST', '/portal/entrar', { token: null, corpo: { email: 'mae@familia.test', codigo: errado } })).status, 400);

  const certo = await chamar('POST', '/portal/entrar', { token: null, corpo: { email: 'mae@familia.test', codigo } });
  assert.equal(certo.status, 200);
  tokenPortal = certo.dados.token;

  assert.equal((await chamar('POST', '/portal/entrar', { token: null, corpo: { email: 'mae@familia.test', codigo } })).status, 400);
});

test('responsável vê os filhos (sem o cancelado) e não abre aluno de outra família', async () => {
  const eu = (await chamar('GET', '/portal/eu', { token: tokenPortal })).dados;
  assert.deepEqual(eu.alunos.map((aluno) => aluno.nome).sort(), ['Filho Dois', 'Filho Um']);
  assert.equal((await chamar('GET', `/portal/alunos/${filho2.id}`, { token: tokenPortal })).status, 200);
  assert.equal((await chamar('GET', `/portal/alunos/${cancelado.id}`, { token: tokenPortal })).status, 404);
  assert.equal((await chamar('GET', `/portal/alunos/${deOutraFamilia.id}`, { token: tokenPortal })).status, 404);
});

test('5 erros invalidam o código', async () => {
  await models.CodigoAcesso.update({ createdAt: new Date(Date.now() - 2 * 60 * 1000) }, { where: {}, silent: true });
  await chamar('POST', '/portal/codigo', { token: null, corpo: { email: 'adulto@teste.test' } });
  const codigo = ultimoCodigo();
  const errado = codigo === '999999' ? '888888' : '999999';
  for (let tentativa = 0; tentativa < 5; tentativa += 1) {
    await chamar('POST', '/portal/entrar', { token: null, corpo: { email: 'adulto@teste.test', codigo: errado } });
  }
  assert.equal((await chamar('POST', '/portal/entrar', { token: null, corpo: { email: 'adulto@teste.test', codigo } })).status, 400);
});
