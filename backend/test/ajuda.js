// Ambiente dos testes automatizados: banco SQLite em memória (um por arquivo de teste, já que o
// node --test roda cada arquivo num processo separado), sem MySQL, sem e-mail e sem Mercado Pago
// de verdade. Precisa ser o PRIMEIRO require de cada teste (antes de qualquer coisa de ../src).
process.env.NODE_ENV = 'test';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.JWT_SECRET = 'segredo-dos-testes';
delete process.env.DB_HOST;

const jwt = require('jsonwebtoken');
const models = require('../src/models');
const app = require('../src/app');
const emailService = require('../src/services/emailService');
const mercadoPagoService = require('../src/services/mercadoPagoService');
const { aplicarAjustesIniciais } = require('../src/config/ajustesIniciais');
const { hoje } = require('../src/services/mensalidadeService');

// E-mails: nada sai; cada envio fica registrado aqui pra o teste conferir.
const emails = [];
for (const nome of Object.keys(emailService)) {
  emailService[nome] = async (dados) => {
    emails.push({ ...dados, funcao: nome });
    return true;
  };
}

// Mercado Pago: sem rede. Por padrão não há Access Token (cai no Pix estático); os testes de
// webhook trocam consultarPagamento pela resposta que querem simular.
mercadoPagoService.criarPagamentoPix = async () => null;
mercadoPagoService.cancelarPagamento = async () => ({});
mercadoPagoService.consultarPagamento = async () => {
  throw new Error('consultarPagamento não simulado neste teste');
};

let servidor = null;
let base = null;

async function iniciar() {
  await models.sequelize.sync({ force: true });
  await aplicarAjustesIniciais();
  await models.Admin.create({ nome: 'Admin', username: 'admin', passwordHash: 'x', perfil: 'admin' });
  // Chave Pix estática pra o fallback sem Mercado Pago gerar um QR.
  await models.Banco.create({ nome: 'Banco', tipoChave: 'email', chavePix: 'pix@sanryu.test', titular: 'SANRYU', cidade: 'SAO PAULO' });

  await new Promise((resolve) => {
    servidor = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${servidor.address().port}/api`;
}

async function encerrar() {
  await new Promise((resolve) => servidor.close(resolve));
  await models.sequelize.close();
}

function token(dados) {
  return jwt.sign(dados, process.env.JWT_SECRET);
}

const tokenAdmin = () => token({ id: 1, username: 'admin', perfil: 'admin' });

// fetch na API de teste: devolve { status, dados }.
async function chamar(metodo, caminho, { corpo, token: tk = tokenAdmin() } = {}) {
  const resposta = await fetch(base + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(tk ? { Authorization: `Bearer ${tk}` } : {}) },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const tipo = resposta.headers.get('content-type') || '';
  return { status: resposta.status, dados: tipo.includes('json') ? await resposta.json() : await resposta.text() };
}

function somarDias(data, dias) {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

// Monta o básico que quase todo teste usa.
async function criarUnidadeEPlano({ valor = 200, periodicidade = 'mensal' } = {}) {
  const unidade = await models.Unidade.findOne();
  const plano = await chamar('POST', '/admin/planos', { corpo: { nome: `Plano ${periodicidade}`, periodicidade, valor, ativo: true } });
  return { unidadeId: unidade.id, plano: plano.dados };
}

module.exports = { models, emails, mercadoPagoService, iniciar, encerrar, chamar, token, tokenAdmin, hoje, somarDias, criarUnidadeEPlano };
