const ajuda = require('./ajuda');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { chamar, models, emails } = ajuda;
const gatameService = require('../src/services/gatameService');

let gratuito;
let pago;

// Gatame simulado: só a Carla tem cadastro (com faixa e professor); o resto não é encontrado.
gatameService.consultarAluno = async (email) =>
  email === 'carla@email.com'
    ? { apto: true, candidatos: [{ nome: 'Carla Dias', faixa: 'Verde', professor: 'Sensei Paulo', numero_carteirinha: '123', origem: 'gatame', email }] }
    : { apto: false };

before(async () => {
  await ajuda.iniciar();
  const instrutor = await models.Instrutor.create({ nome: 'Sensei Rodrigo' });
  // O id 1 é o Exame de Faixa no sistema: ocupa ele pra o treinamento ficar com outro id, como na vida real.
  await models.TipoEvento.create({ nome: 'Exame de Faixa', cobravel: true });
  const tipo = await models.TipoEvento.create({ nome: 'Treinamento', cobravel: true, treinamento: true });
  gratuito = await models.Evento.create({ nome: 'Treinamento de Defesa', data: new Date('2026-11-20T13:00:00Z'), tipoEventoId: tipo.id, publicado: true, local: 'Dojo San·Ryu', cargaHoraria: '4 horas', instrutorId: instrutor.id });
  pago = await models.Evento.create({ nome: 'Treinamento Pago', data: new Date('2026-11-21T13:00:00Z'), tipoEventoId: tipo.id, publicado: true, valor: 50 });
});

after(async () => {
  await ajuda.encerrar();
});

function inscrever(evento, corpo) {
  return chamar('POST', `/eventos/${evento.slug}/inscricoes`, { corpo, token: null });
}

test('treinamento: inscrição aberta sem Gatame, validações e menor precisa de responsável', async () => {
  const publico = await chamar('GET', `/eventos/${gratuito.slug}/publico`, { token: null });
  assert.equal(publico.dados.tipoEvento.treinamento, true);

  assert.equal((await inscrever(gratuito, { email: 'x@y.com', nome: 'Ana Lima' })).status, 400, 'sem nascimento');
  assert.equal((await inscrever(gratuito, { email: 'x@y.com', nome: 'Ana Lima', dataNascimento: '2015-01-01' })).status, 400, 'menor sem responsável');

  const ok = await inscrever(gratuito, { email: ' ANA@Email.com ', nome: 'Ana  Lima', dataNascimento: '1990-05-10', telefone: '11999990000', faixa: 'Branca', professor: 'Sensei Rodrigo' });
  assert.equal(ok.status, 201);
  assert.equal(ok.dados.email, 'ana@email.com');
  assert.equal(ok.dados.nome, 'Ana Lima');
  assert.equal(ok.dados.statusPagamento, 'pago', 'sem valor: gratuito');
  assert.equal(ok.dados.origemDados, 'treinamento');

  const denovo = await inscrever(gratuito, { email: 'ana@email.com', nome: 'Ana Lima', dataNascimento: '1990-05-10' });
  assert.equal(denovo.dados.jaInscrito, true);

  // Sem cadastro no Gatame: faixa e professor são obrigatórios.
  assert.equal((await inscrever(gratuito, { email: 'z@y.com', nome: 'Zeca Lima', dataNascimento: '1990-01-01', professor: 'Sensei Rodrigo' })).status, 400, 'sem faixa');
  assert.equal((await inscrever(gratuito, { email: 'z@y.com', nome: 'Zeca Lima', dataNascimento: '1990-01-01', faixa: 'Branca' })).status, 400, 'sem professor');

  const menor = await inscrever(gratuito, { email: 'pai@email.com', nome: 'Leo Lima', dataNascimento: '2016-03-03', responsavel: 'Carlos Lima', faixa: 'Cinza', professor: 'Sensei Rodrigo' });
  assert.equal(menor.status, 201);
  assert.equal(menor.dados.responsavel, 'Carlos Lima');
});

test('treinamento: com cadastro no Gatame usa a faixa e o professor de lá', async () => {
  const consulta = await chamar('POST', `/eventos/${gratuito.slug}/consulta`, { corpo: { email: 'carla@email.com' }, token: null });
  assert.equal(consulta.dados.candidatos[0].professor, 'Sensei Paulo');

  // Mesmo que a tela mande outra coisa, vale o que está no Gatame.
  const inscricao = await inscrever(gratuito, { email: 'carla@email.com', nome: 'carla dias', dataNascimento: '1988-08-08', faixa: 'Branca' });
  assert.equal(inscricao.status, 201);
  assert.equal(inscricao.dados.faixaAtual, 'Verde');
  assert.equal(inscricao.dados.professor, 'Sensei Paulo');
  assert.equal(inscricao.dados.origemDados, 'gatame');
  assert.equal(inscricao.dados.numeroCarteirinha, '123');
});

test('treinamento pago gera Pix com o valor do evento', async () => {
  const inscricao = await inscrever(pago, { email: 'bia@email.com', nome: 'Bia Souza', dataNascimento: '1995-02-02', faixa: 'Amarela', professor: 'Sensei X' });
  assert.equal(inscricao.status, 201);
  assert.equal(Number(inscricao.dados.valorCobrado), 50);
  assert.equal(inscricao.dados.statusPagamento, 'pendente');
  assert.ok(inscricao.dados.pixCopiaCola, 'Pix estático do banco');
});

test('certificados: só inscrições pagas, texto com os dados do evento e não repete', async () => {
  const antes = emails.filter((email) => email.funcao === 'enviarCertificado').length;
  const envio = await chamar('POST', `/admin/eventos/${gratuito.id}/certificados`, { corpo: {} });
  assert.equal(envio.status, 200);
  assert.equal(envio.dados.enviados, 3);
  assert.equal(emails.filter((email) => email.funcao === 'enviarCertificado').length - antes, 3);

  const ana = await models.EventoAluno.findOne({ where: { eventoId: gratuito.id, nome: 'Ana Lima' } });
  assert.ok(ana.tokenCertificado && ana.certificadoEnviadoEm);
  const certificado = await chamar('GET', `/certificados/${ana.tokenCertificado}`, { token: null });
  assert.equal(certificado.status, 200);
  assert.match(certificado.dados.texto, /Certificamos que Ana Lima participou do treinamento Treinamento de Defesa, realizado em 20 de novembro de 2026, em Dojo San·Ryu, com carga horária de 4 horas\./);
  assert.equal(certificado.dados.instrutor, 'Sensei Rodrigo');

  // Segunda vez: só quem ainda não recebeu (ninguém).
  assert.equal((await chamar('POST', `/admin/eventos/${gratuito.id}/certificados`, { corpo: {} })).dados.enviados, 0);
  // Texto editado pelo admin, com marcadores.
  await gratuito.update({ textoCertificado: '{{nome}} concluiu {{evento}} ({{cargaHoraria}}) com {{instrutor}}.' });
  assert.equal((await chamar('GET', `/certificados/${ana.tokenCertificado}`, { token: null })).dados.texto, 'Ana Lima concluiu Treinamento de Defesa (4 horas) com Sensei Rodrigo.');

  // Pago pendente não recebe; token inválido = 404.
  const envioPago = await chamar('POST', `/admin/eventos/${pago.id}/certificados`, { corpo: {} });
  assert.equal(envioPago.dados.enviados, 0);
  assert.equal(envioPago.dados.semPagamento, 1);
  assert.equal((await chamar('GET', '/certificados/nao-existe', { token: null })).status, 404);
});

test('QR Code da inscrição aponta pra página do evento', async () => {
  const resposta = await chamar('GET', `/admin/eventos/${gratuito.id}/qrcode-inscricao`);
  assert.equal(resposta.status, 200);
  assert.ok(resposta.dados.link.endsWith(`/eventos/${gratuito.slug}`));
  assert.match(resposta.dados.qrcode, /^data:image\/png;base64,/);
});
