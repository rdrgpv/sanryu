const ajuda = require('./ajuda');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { chamar, models, emails, hoje, somarDias, token } = ajuda;

let unidadeId;
let turma;
let irmao1;
let irmao2;
let adulto;

before(async () => {
  await ajuda.iniciar();
  unidadeId = (await models.Unidade.findOne()).id;
  turma = (await chamar('POST', '/admin/turmas', { corpo: { nome: 'Kids', modalidade: 'J', diaSemana: 'Segunda', horaInicio: '18:00', horaFim: '19:00', unidadeId } })).dados;
  irmao1 = (await chamar('POST', '/admin/alunos', { corpo: { nome: 'Irmão Um', unidadeId, responsavelNovo: { nome: 'Mãe', email: 'mae@familia.test' } } })).dados;
  irmao2 = (await chamar('POST', '/admin/alunos', { corpo: { nome: 'Irmão Dois', unidadeId, responsavelId: irmao1.responsavelId } })).dados;
  adulto = (await chamar('POST', '/admin/alunos', { corpo: { nome: 'Adulto', unidadeId, email: 'adulto@teste.test' } })).dados;
  await chamar('POST', '/admin/alunos', { corpo: { nome: 'Sem Email', unidadeId } });
  await chamar('POST', '/admin/alunos', { corpo: { nome: 'Externo', vinculo: 'externo', email: 'externo@teste.test' } });
  await chamar('POST', `/admin/alunos/${irmao1.id}/matricular`, { corpo: { turmaId: turma.id } });
});
after(ajuda.encerrar);

test('prévia: um e-mail por família, sem externos, e conta quem não tem e-mail', async () => {
  const previa = (await chamar('POST', '/admin/avisos/previa', { corpo: { publico: 'todos' } })).dados;
  assert.equal(previa.total, 2); // mãe (2 filhos) + adulto
  assert.equal(previa.semEmail, 1);

  const daTurma = (await chamar('POST', '/admin/avisos/previa', { corpo: { publico: 'turma', alvoId: turma.id } })).dados;
  assert.equal(daTurma.total, 1);
  assert.equal(daTurma.descricao, 'Turma Kids');
  assert.equal((await chamar('POST', '/admin/avisos/previa', { corpo: { publico: 'turma' } })).status, 400);
});

test('envio em segundo plano conta os enviados; aviso da turma aparece no portal só pra quem é da turma', async () => {
  const antes = emails.length;
  const criado = await chamar('POST', '/admin/avisos', { corpo: { titulo: 'Feriado', mensagem: 'Sem aula <b>segunda</b>.', publico: 'turma', alvoId: turma.id, enviarEmail: true, mostrarNoPortal: true } });
  assert.equal(criado.status, 201);

  for (let tentativa = 0; tentativa < 20; tentativa += 1) {
    const aviso = await models.Aviso.findByPk(criado.dados.id);
    if (aviso.status === 'concluido') break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const aviso = await models.Aviso.findByPk(criado.dados.id);
  assert.equal(aviso.status, 'concluido');
  assert.equal(aviso.enviados, 1);
  assert.equal(emails.slice(antes).filter((email) => email.funcao === 'enviarAviso')[0].destinatario, 'mae@familia.test');

  const { avisosDoPortal } = require('../src/services/avisoService');
  assert.equal((await avisosDoPortal([irmao1.id])).length, 1);
  assert.equal((await avisosDoPortal([adulto.id])).length, 0);
});

test('aviso de evento não pode ir pra área do aluno; precisa de pelo menos um canal', async () => {
  assert.equal((await chamar('POST', '/admin/avisos', { corpo: { titulo: 'X', mensagem: 'Y', publico: 'inadimplentes', mostrarNoPortal: true, enviarEmail: false } })).status, 400);
  assert.equal((await chamar('POST', '/admin/avisos', { corpo: { titulo: 'X', mensagem: 'Y', publico: 'todos', enviarEmail: false, mostrarNoPortal: false } })).status, 400);
});

test('e-mail do aviso escapa HTML digitado no admin', async () => {
  // Usa a função real (a ajuda substituiu as do módulo): carrega uma cópia isolada do emailService.
  const caminho = require.resolve('../src/services/emailService');
  delete require.cache[caminho];
  const emailReal = require('../src/services/emailService');
  const nodemailer = require('nodemailer');
  const original = nodemailer.createTransport;
  let mensagem;
  nodemailer.createTransport = () => ({ sendMail: async (dados) => { mensagem = dados; return {}; } });
  await models.Configuracao.bulkCreate(['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_SENHA'].map((parametro) => ({ sistema: 'SAN', parametro, valor: '1', tipoParametro: 'S' })));
  try {
    assert.equal(await emailReal.enviarAviso({ destinatario: 'a@b.test', nome: 'Ana', titulo: 'T', mensagem: 'linha 1\n<script>x</script>' }), true);
    assert.ok(mensagem.html.includes('&lt;script&gt;'));
    assert.ok(mensagem.html.includes('linha 1<br>'));
  } finally {
    nodemailer.createTransport = original;
    delete require.cache[caminho];
  }
});

test('relatórios: CSV pro Excel (BOM, ";" e vírgula decimal) e só admin baixa', async () => {
  await chamar('POST', '/admin/financeiro/lancamentos', { corpo: { tipo: 'despesa', descricao: 'Aluguel; sala 1', valor: 1234.5, vencimento: hoje(), pago: true, formaPagamento: 'transferencia' } });
  const resposta = await fetch(`http://127.0.0.1:${ajuda.porta()}/api/admin/relatorios/despesas?inicio=${somarDias(hoje(), -1)}&fim=${hoje()}`, {
    headers: { Authorization: `Bearer ${ajuda.tokenAdmin()}` },
  });
  assert.equal(resposta.status, 200);
  assert.match(resposta.headers.get('content-disposition'), /sanryu-despesas-pagas-/);
  const texto = Buffer.from(await resposta.arrayBuffer()).toString('utf8');
  assert.equal(texto.charCodeAt(0), 0xfeff);
  const [cabecalho, linha] = texto.slice(1).split('\r\n');
  assert.ok(cabecalho.startsWith('Tipo;Descrição;Categoria'));
  assert.ok(linha.includes('"Aluguel; sala 1"'));
  assert.ok(linha.includes('1234,50'));

  for (const tipo of ['recebimentos', 'lancamentos', 'por-categoria', 'mensalidades', 'inadimplencia']) {
    assert.equal((await chamar('GET', `/admin/relatorios/${tipo}`)).status, 200, tipo);
  }
  assert.equal((await chamar('GET', '/admin/relatorios/despesas?inicio=2026-12-01&fim=2026-01-01')).status, 400);
  const recepcao = token({ id: 77, perfil: 'recepcao' });
  assert.equal((await chamar('GET', '/admin/relatorios/despesas', { token: recepcao })).status, 403);
});

test('pedidos da loja mostram se já foram recebidos', async () => {
  const venda = await models.Pedido.create({ nomeCliente: 'Cliente', dataPedido: new Date(), valorProdutos: 90, valorPersonalizacoes: 0, valorDesconto: 0, valorTotal: 90, situacao: 'P' });
  let lista = (await chamar('GET', '/admin/pedidos')).dados;
  assert.equal(lista.find((pedido) => pedido.id === venda.id).recebimento.status, 'pendente');

  const lancamento = await models.Lancamento.findOne({ where: { origem: 'pedido', origemId: venda.id } });
  await chamar('POST', `/admin/financeiro/lancamentos/${lancamento.id}/baixar`, { corpo: { valorPago: 90, formaPagamento: 'dinheiro', dataPagamento: hoje() } });
  lista = (await chamar('GET', '/admin/pedidos')).dados;
  assert.equal(lista.find((pedido) => pedido.id === venda.id).recebimento.status, 'pago');
});

test('recepção cuida de academias e alunos Morganti, sem excluir', async () => {
  const recepcao = token({ id: 77, perfil: 'recepcao' });
  const academia = await chamar('POST', '/admin/academias', { token: recepcao, corpo: { nome: 'Academia X' } });
  assert.equal(academia.status, 201);
  assert.equal((await chamar('PUT', `/admin/academias/${academia.dados.id}`, { token: recepcao, corpo: { nome: 'Academia X2' } })).status, 200);
  assert.equal((await chamar('DELETE', `/admin/academias/${academia.dados.id}`, { token: recepcao })).status, 403);
  const externo = await chamar('POST', '/admin/alunos', { token: recepcao, corpo: { nome: 'Externo 2', vinculo: 'externo', academiaId: academia.dados.id } });
  assert.equal(externo.status, 201);
  assert.equal((await chamar('GET', '/admin/alunos?vinculo=externo', { token: recepcao })).status, 200);
});
