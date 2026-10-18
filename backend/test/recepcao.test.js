const ajuda = require('./ajuda');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { chamar, models, hoje, somarDias } = ajuda;

let tokenRecepcao;
let unidadeId;
let plano;

before(async () => {
  await ajuda.iniciar();
  ({ unidadeId, plano } = await ajuda.criarUnidadeEPlano({ valor: 180 }));
  const criado = await chamar('POST', '/admin/usuarios', { corpo: { nome: 'Recepção', username: 'recepcao', senha: 'senha-recepcao-1', perfil: 'recepcao' } });
  assert.equal(criado.status, 201);
  tokenRecepcao = (await chamar('POST', '/auth/login', { token: null, corpo: { username: 'recepcao', password: 'senha-recepcao-1' } })).dados.token;
});
after(ajuda.encerrar);

const como = (metodo, caminho, corpo) => chamar(metodo, caminho, { corpo, token: tokenRecepcao });

test('recepção faz o dia a dia: aluno, contrato, receber mensalidade, interessado, chamada', async () => {
  const aluno = await como('POST', '/admin/alunos', { nome: 'Novo Aluno', unidadeId, responsavelNovo: { nome: 'Mãe' } });
  assert.equal(aluno.status, 201);
  assert.equal((await como('PUT', `/admin/alunos/${aluno.dados.id}`, { nome: 'Novo Aluno Silva' })).status, 200);

  const contrato = await como('POST', '/admin/contratos', { alunoId: aluno.dados.id, planoId: plano.id, diaVencimento: 10, dataInicio: somarDias(hoje(), -40) });
  assert.equal(contrato.status, 201);

  assert.equal((await como('POST', '/admin/mensalidades/gerar')).status, 200);
  const mensalidade = await models.Mensalidade.findOne({ where: { alunoId: aluno.dados.id } });
  const pagamento = await como('POST', `/admin/mensalidades/${mensalidade.id}/pagamento`, { valorPago: 180, formaPagamento: 'dinheiro', pagoEm: hoje() });
  assert.equal(pagamento.status, 200);

  assert.equal((await como('POST', '/admin/leads', { nome: 'Interessado', telefone: '11999998888' })).status, 201);
  assert.equal((await como('GET', '/sensei/turmas')).status, 200);
});

test('recepção não entra no financeiro, configurações, preços, usuários e loja', async () => {
  const proibidos = [
    ['GET', '/admin/financeiro/resumo'],
    ['GET', '/admin/financeiro/lancamentos'],
    ['GET', '/admin/configuracoes'],
    ['GET', '/admin/configuracao-academia'],
    ['GET', '/admin/bancos'],
    ['GET', '/admin/usuarios'],
    ['POST', '/admin/planos'],
    ['GET', '/admin/pedidos-compra'],
    ['GET', '/admin/produtos'],
  ];
  for (const [metodo, caminho] of proibidos) {
    assert.equal((await como(metodo, caminho, metodo === 'GET' ? undefined : {})).status, 403, `${metodo} ${caminho}`);
  }
});

test('recepção não exclui aluno nem desfaz/cancela pagamento', async () => {
  const aluno = (await chamar('POST', '/admin/alunos', { corpo: { nome: 'Protegido', unidadeId } })).dados;
  assert.equal((await como('DELETE', `/admin/alunos/${aluno.id}`)).status, 403);

  const paga = await models.Mensalidade.findOne({ where: { status: 'pago' } });
  assert.equal((await como('POST', `/admin/mensalidades/${paga.id}/reabrir`)).status, 403);
  assert.equal((await como('POST', `/admin/mensalidades/${paga.id}/cancelar`, {})).status, 403);
});

test('dashboard da recepção não traz os números do caixa', async () => {
  const daRecepcao = (await como('GET', '/admin/dashboard')).dados;
  assert.equal(daRecepcao.recebidoNoMes, undefined);
  assert.equal(daRecepcao.financeiro, undefined);
  assert.ok(daRecepcao.inadimplencia);

  const doAdmin = (await chamar('GET', '/admin/dashboard')).dados;
  assert.ok(Array.isArray(doAdmin.financeiro));
});

test('usuários: sempre sobra um admin e ninguém exclui a si mesmo', async () => {
  const lista = (await chamar('GET', '/admin/usuarios')).dados;
  const admin = lista.find((usuario) => usuario.perfil === 'admin');
  assert.ok(!JSON.stringify(lista).includes('passwordHash'));

  assert.equal((await chamar('PUT', `/admin/usuarios/${admin.id}`, { corpo: { perfil: 'recepcao' } })).status, 400);
  assert.equal((await chamar('DELETE', `/admin/usuarios/${admin.id}`)).status, 400);
  assert.equal((await chamar('POST', '/admin/usuarios', { corpo: { nome: 'X', username: 'recepcao', senha: 'outra-senha-9', perfil: 'recepcao' } })).status, 400);
});

test('troca da própria senha exige a senha atual', async () => {
  assert.equal((await chamar('PUT', '/auth/senha', { token: tokenRecepcao, corpo: { senhaAtual: 'errada', novaSenha: 'nova-senha-123' } })).status, 400);
  assert.equal((await chamar('PUT', '/auth/senha', { token: tokenRecepcao, corpo: { senhaAtual: 'senha-recepcao-1', novaSenha: 'nova-senha-123' } })).status, 200);
  const login = await chamar('POST', '/auth/login', { token: null, corpo: { username: 'recepcao', password: 'nova-senha-123' } });
  assert.equal(login.status, 200);
});

test('recibo: só de mensalidade paga, com valor por extenso e pagador correto', async () => {
  const configuracao = await models.ConfiguracaoAcademia.findOne();
  await configuracao.update({ reciboNome: 'San Ryu Dojo Ltda', reciboDocumento: '12.345.678/0001-90' });

  const paga = await models.Mensalidade.findOne({ where: { status: 'pago' } });
  const recibo = await chamar('GET', `/mensalidades/${paga.token}/recibo`, { token: null });
  assert.equal(recibo.status, 200);
  assert.equal(recibo.dados.valor, 180);
  assert.equal(recibo.dados.valorPorExtenso, 'cento e oitenta reais');
  assert.equal(recibo.dados.emissor.documento, '12.345.678/0001-90');
  assert.equal(recibo.dados.pagador.nome, 'Mãe'); // aluno sem data de nascimento mas com responsável: quem paga é o responsável
  assert.equal(recibo.dados.formaPagamento, 'dinheiro');

  const pendente = await models.Mensalidade.findOne({ where: { status: 'pendente' } });
  if (pendente) assert.equal((await chamar('GET', `/mensalidades/${pendente.token}/recibo`, { token: null })).status, 404);
});
