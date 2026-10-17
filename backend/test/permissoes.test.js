const ajuda = require('./ajuda');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { chamar, token } = ajuda;

before(ajuda.iniciar);
after(ajuda.encerrar);

test('rotas do admin exigem login', async () => {
  const { status } = await chamar('GET', '/admin/alunos', { token: null });
  assert.equal(status, 401);
});

test('token antigo de admin (sem perfil) continua sendo admin', async () => {
  const { status } = await chamar('GET', '/admin/alunos', { token: token({ id: 1, username: 'admin' }) });
  assert.equal(status, 200);
});

test('sensei não entra em nenhuma rota do admin', async () => {
  const sensei = token({ id: 9, perfil: 'instrutor', instrutorId: 1 });
  for (const caminho of ['/admin/alunos', '/admin/mensalidades', '/admin/financeiro/resumo', '/admin/frequencia', '/admin/leads']) {
    const { status } = await chamar('GET', caminho, { token: sensei });
    assert.equal(status, 403, caminho);
  }
});

test('sessão do portal não entra no admin nem na chamada', async () => {
  const portal = token({ perfil: 'portal', email: 'x@teste.test' });
  assert.equal((await chamar('GET', '/admin/alunos', { token: portal })).status, 403);
  assert.equal((await chamar('GET', '/sensei/turmas', { token: portal })).status, 403);
});

test('admin não usa as rotas do portal', async () => {
  assert.equal((await chamar('GET', '/portal/eu')).status, 403);
});

test('token assinado com outro segredo é recusado', async () => {
  const jwt = require('jsonwebtoken');
  const falso = jwt.sign({ id: 1, perfil: 'admin' }, 'outro-segredo');
  assert.equal((await chamar('GET', '/admin/alunos', { token: falso })).status, 401);
});

test('lista de instrutores do admin mostra o login do sensei, nunca o hash da senha', async () => {
  const instrutor = await chamar('POST', '/admin/instrutores', { corpo: { nome: 'Sensei Teste' } });
  await chamar('POST', `/admin/instrutores/${instrutor.dados.id}/acesso`, { corpo: { username: 'sensei.teste', senha: 'senha-segura-1' } });
  const lista = await chamar('GET', '/admin/instrutores');
  assert.equal(lista.dados.find((item) => item.id === instrutor.dados.id).acesso.username, 'sensei.teste');
  assert.ok(!JSON.stringify(lista.dados).includes('passwordHash'));

  const publica = await chamar('GET', '/instrutores', { token: null });
  assert.ok(!JSON.stringify(publica.dados).includes('sensei.teste'), 'rota pública não pode expor o login');
});
