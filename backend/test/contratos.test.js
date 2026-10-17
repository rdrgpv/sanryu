const ajuda = require('./ajuda');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { chamar, models } = ajuda;
const ASSINATURA = 'data:image/png;base64,iVBORw0KGgo=';

let unidadeId;
let plano;

before(async () => {
  await ajuda.iniciar();
  ({ unidadeId, plano } = await ajuda.criarUnidadeEPlano({ valor: 200 }));
  const configuracao = await models.ConfiguracaoAcademia.findOne();
  await configuracao.update({ descontoFamiliaPercentual: 10 });
});
after(ajuda.encerrar);

async function novoAluno(dados) {
  const resposta = await chamar('POST', '/admin/alunos', { corpo: { unidadeId, ...dados } });
  assert.equal(resposta.status, 201, JSON.stringify(resposta.dados));
  return resposta.dados;
}

test('irmãos: o primeiro paga cheio, o segundo tem desconto família, e bolsa soma em sequência', async () => {
  const filho1 = await novoAluno({ nome: 'Filho Um', dataNascimento: '2016-01-01', responsavelNovo: { nome: 'Mãe' } });
  const filho2 = await novoAluno({ nome: 'Filho Dois', dataNascimento: '2018-01-01', responsavelId: filho1.responsavelId });

  const c1 = await chamar('POST', '/admin/contratos', { corpo: { alunoId: filho1.id, planoId: plano.id, diaVencimento: 10 } });
  assert.equal(Number(c1.dados.valorFinal), 200);

  const c2 = await chamar('POST', '/admin/contratos', { corpo: { alunoId: filho2.id, planoId: plano.id, diaVencimento: 10, bolsaPercentual: 50, motivoBolsa: 'Projeto' } });
  assert.equal(Number(c2.dados.descontoFamiliaPercentual), 10);
  assert.equal(Number(c2.dados.valorFinal), 90); // 200 × 0,9 × 0,5
});

test('aluno não pode ter dois contratos ativos', async () => {
  const aluno = await novoAluno({ nome: 'Único' });
  await chamar('POST', '/admin/contratos', { corpo: { alunoId: aluno.id, planoId: plano.id, diaVencimento: 5 } });
  const segundo = await chamar('POST', '/admin/contratos', { corpo: { alunoId: aluno.id, planoId: plano.id, diaVencimento: 5 } });
  assert.equal(segundo.status, 400);
});

test('validações: bolsa sem motivo e vencimento fora de 1–28', async () => {
  const aluno = await novoAluno({ nome: 'Validações' });
  assert.equal((await chamar('POST', '/admin/contratos', { corpo: { alunoId: aluno.id, planoId: plano.id, diaVencimento: 10, bolsaPercentual: 30 } })).status, 400);
  assert.equal((await chamar('POST', '/admin/contratos', { corpo: { alunoId: aluno.id, planoId: plano.id, diaVencimento: 31 } })).status, 400);
});

test('assinatura pelo link: menor assina pelo responsável, contrato trava e não aceita outra assinatura', async () => {
  const aluno = await novoAluno({ nome: 'Assina', dataNascimento: '2015-05-05', responsavelNovo: { nome: 'Pai Assinante', cpf: '529.982.247-25' } });
  const contrato = (await chamar('POST', '/admin/contratos', { corpo: { alunoId: aluno.id, planoId: plano.id, diaVencimento: 15 } })).dados;

  const publico = await chamar('GET', `/contratos/${contrato.tokenAssinatura}`, { token: null });
  assert.equal(publico.dados.nomeAssinante, 'Pai Assinante');
  assert.match(publico.dados.termo, /CONTRATANTE: Pai Assinante, CPF 529\.982\.247-25/);

  const assinatura = await chamar('POST', `/contratos/${contrato.tokenAssinatura}/assinatura`, {
    token: null,
    corpo: { nomeAssinante: 'Pai Assinante', assinatura: ASSINATURA, autorizaReconhecimentoFacial: true },
  });
  assert.equal(assinatura.status, 200);
  assert.equal((await models.Aluno.findByPk(aluno.id)).consentimentoBiometria, true);

  const deNovo = await chamar('POST', `/contratos/${contrato.tokenAssinatura}/assinatura`, { token: null, corpo: { nomeAssinante: 'X', assinatura: ASSINATURA } });
  assert.equal(deNovo.status, 400);

  const editado = await chamar('PUT', `/admin/contratos/${contrato.id}`, { corpo: { diaVencimento: 20, observacoes: 'só isso muda' } });
  assert.equal(editado.dados.diaVencimento, 15);
  assert.equal(editado.dados.observacoes, 'só isso muda');
  assert.equal((await chamar('DELETE', `/admin/contratos/${contrato.id}`)).status, 400);
});

test('mudar o preço do plano não altera contrato já feito', async () => {
  const aluno = await novoAluno({ nome: 'Preço Antigo' });
  const outroPlano = (await chamar('POST', '/admin/planos', { corpo: { nome: 'Reajuste', periodicidade: 'mensal', valor: 150, ativo: true } })).dados;
  const contrato = (await chamar('POST', '/admin/contratos', { corpo: { alunoId: aluno.id, planoId: outroPlano.id, diaVencimento: 10 } })).dados;
  await chamar('PUT', `/admin/planos/${outroPlano.id}`, { corpo: { ...outroPlano, valor: 999 } });
  assert.equal(Number((await models.Contrato.findByPk(contrato.id)).valorFinal), 150);
});

test('e-mail do aluno é opcional e pode repetir entre irmãos', async () => {
  await novoAluno({ nome: 'Irmã A', email: 'Familia@Teste.test' });
  const b = await novoAluno({ nome: 'Irmã B', email: 'familia@teste.test' });
  assert.equal(b.email, 'familia@teste.test');
  await novoAluno({ nome: 'Sem e-mail', email: '' });
});
