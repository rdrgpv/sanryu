// TRUST_PROXY=1 antes de carregar o app (um proxy na frente, como na hospedagem).
process.env.TRUST_PROXY = '1';
const ajuda = require('./ajuda');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/app');

before(ajuda.iniciar);
after(ajuda.encerrar);

test('com 1 proxy, req.ip é o cliente que o proxy viu — não o que o cliente inventou', () => {
  const resolver = app.get('trust proxy fn');
  // Cadeia que chega no Node: "<forjado pelo cliente>, <IP real anotado pelo proxy>", vinda do proxy.
  const proxyaddr = require('proxy-addr');
  const req = { connection: { remoteAddress: '10.0.0.5' }, headers: { 'x-forwarded-for': '6.6.6.6, 200.100.50.25' } };
  assert.equal(proxyaddr(req, resolver), '200.100.50.25');
});

test('limite antispam conta por cliente real, não pelo proxy', async () => {
  // 10 agendamentos de clientes diferentes atrás do mesmo proxy não bloqueiam o 11º cliente.
  for (let indice = 0; indice < 11; indice += 1) {
    const resposta = await fetch(`http://127.0.0.1:${ajuda.porta()}/api/aula-experimental`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `189.0.0.${indice + 1}` },
      body: JSON.stringify({ nome: `Pessoa ${indice}`, telefone: `1199999${String(indice).padStart(4, '0')}`, aceiteContato: true }),
    });
    assert.notEqual(resposta.status, 429, `cliente ${indice} não deveria ser barrado`);
  }
});
