const ajuda = require('./ajuda');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const nodemailer = require('nodemailer');

const { models } = ajuda;

// O ajuda.js troca o emailService por versões falsas; aqui carrega o verdadeiro de novo, com o
// nodemailer simulado, pra conferir de qual caixa e com qual remetente o certificado sai.
let emailService;
const transportes = [];
const enviados = [];

before(async () => {
  await ajuda.iniciar();
  nodemailer.createTransport = (opcoes) => {
    transportes.push(opcoes);
    return { sendMail: async (mensagem) => enviados.push(mensagem) };
  };
  delete require.cache[require.resolve('../src/services/emailService')];
  emailService = require('../src/services/emailService');

  const configuracoes = { SMTP_HOST: 'smtp.hostinger.com', SMTP_PORT: '465', SMTP_USER: 'contato@sanryu.com.br', SMTP_SENHA: 'senha-contato', SMTP_FROM: 'San·Ryu Dojo <contato@sanryu.com.br>' };
  for (const [parametro, valor] of Object.entries(configuracoes)) {
    await models.Configuracao.create({ sistema: 'SAN', parametro, valor, tipoParametro: 'S' });
  }
});

after(async () => {
  await ajuda.encerrar();
});

const dados = { destinatario: 'ana@email.com', nome: 'Ana', evento: 'Mega Aulão', link: 'https://sanryu.com.br/certificados/x' };

test('certificado sem configuração própria sai da caixa padrão', async () => {
  assert.equal(await emailService.enviarCertificado(dados), true);
  assert.equal(transportes.at(-1).auth.user, 'contato@sanryu.com.br');
  assert.equal(enviados.at(-1).from, 'San·Ryu Dojo <contato@sanryu.com.br>');
});

test('certificado com remetente e caixa próprios usa o login dessa caixa', async () => {
  await models.Configuracao.create({ sistema: 'SAN', parametro: 'CERTIFICADO_FROM', valor: 'Morganti Ju-Jitsu <certificados@sanryu.com.br>', tipoParametro: 'S' });
  await models.Configuracao.create({ sistema: 'SAN', parametro: 'CERTIFICADO_SMTP_USER', valor: 'certificados@sanryu.com.br', tipoParametro: 'S' });
  await models.Configuracao.create({ sistema: 'SAN', parametro: 'CERTIFICADO_SMTP_SENHA', valor: 'senha-cert', tipoParametro: 'S' });

  assert.equal(await emailService.enviarCertificado(dados), true);
  assert.deepEqual(transportes.at(-1).auth, { user: 'certificados@sanryu.com.br', pass: 'senha-cert' });
  assert.equal(transportes.at(-1).host, 'smtp.hostinger.com', 'mesmo servidor');
  assert.equal(enviados.at(-1).from, 'Morganti Ju-Jitsu <certificados@sanryu.com.br>');

  // Os outros e-mails continuam saindo da caixa padrão.
  await emailService.enviarAviso({ destinatario: 'ana@email.com', nome: 'Ana', titulo: 'Aviso', mensagem: 'Oi' });
  assert.equal(transportes.at(-1).auth.user, 'contato@sanryu.com.br');
});
