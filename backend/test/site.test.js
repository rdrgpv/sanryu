const ajuda = require('./ajuda');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { chamar, models } = ajuda;

before(async () => {
  await ajuda.iniciar();
});

after(async () => {
  await ajuda.encerrar();
});

test('site mostra contato configurado e só planos ativos marcados pro site, com valor mensal', async () => {
  const configuracao = await chamar('GET', '/admin/configuracao-academia');
  const salvo = await chamar('PUT', '/admin/configuracao-academia', {
    corpo: { ...configuracao.dados, siteWhatsapp: ' (11) 98765-4321 ', siteInstagram: '@sanryudojo', siteTelefone: '' },
  });
  assert.equal(salvo.status, 200);

  await chamar('POST', '/admin/planos', { corpo: { nome: 'Mensal', periodicidade: 'mensal', valor: 200, ativo: true } });
  await chamar('POST', '/admin/planos', { corpo: { nome: 'Trimestral', periodicidade: 'trimestral', valor: 540, ativo: true } });
  await chamar('POST', '/admin/planos', { corpo: { nome: 'Bolsista', periodicidade: 'mensal', valor: 0, ativo: true, exibirNoSite: false } });
  await chamar('POST', '/admin/planos', { corpo: { nome: 'Antigo', periodicidade: 'mensal', valor: 150, ativo: false } });

  const site = await chamar('GET', '/site', { token: null });
  assert.equal(site.status, 200);
  assert.equal(site.dados.contato.whatsapp, '(11) 98765-4321');
  assert.equal(site.dados.contato.instagram, '@sanryudojo');
  assert.equal(site.dados.contato.telefone, null);
  assert.deepEqual(site.dados.planos.map((plano) => plano.nome), ['Mensal', 'Trimestral']);
  assert.equal(site.dados.planos.find((plano) => plano.nome === 'Trimestral').valorMensal, 180);
});

test('instrutores no site: só os marcados, com títulos e foto, sem e-mail', async () => {
  const criado = await chamar('POST', '/admin/instrutores', {
    corpo: {
      nome: 'Sensei Visível',
      email: 'sensei@sanryu.test',
      foto: 'data:image/jpeg;base64,AAAA',
      titulos: ['Campeão Paulista 2023', '  ', 'Instrutor credenciado'],
      exibirNoSite: true,
    },
  });
  assert.equal(criado.status, 201);
  await chamar('POST', '/admin/instrutores', { corpo: { nome: 'Sensei Oculto', email: 'oculto@sanryu.test' } });

  const publico = await chamar('GET', '/instrutores', { token: null });
  assert.equal(publico.status, 200);
  assert.equal(publico.dados.length, 1);
  assert.equal(publico.dados[0].nome, 'Sensei Visível');
  assert.deepEqual(publico.dados[0].titulos, ['Campeão Paulista 2023', 'Instrutor credenciado']);
  assert.equal(publico.dados[0].foto, 'data:image/jpeg;base64,AAAA');
  assert.equal(publico.dados[0].email, undefined);

  // A listagem do admin não carrega a foto (pesada); o detalhe carrega.
  const lista = await chamar('GET', '/admin/instrutores');
  assert.equal(lista.dados.find((item) => item.id === criado.dados.id).foto, undefined);
  const detalhe = await chamar('GET', `/admin/instrutores/${criado.dados.id}`);
  assert.equal(detalhe.dados.foto, 'data:image/jpeg;base64,AAAA');
});

test('turmas públicas não expõem o e-mail do instrutor', async () => {
  const instrutor = await models.Instrutor.create({ nome: 'Professor', email: 'prof@sanryu.test' });
  const unidade = await models.Unidade.findOne();
  await models.Turma.create({ nome: 'Adulto', modalidade: 'Ju-Jitsu', nivel: 'Todos', diaSemana: 'Segunda', horaInicio: '19:00', horaFim: '20:00', vagas: 20, instrutorId: instrutor.id, unidadeId: unidade.id });

  const turmas = await chamar('GET', '/turmas', { token: null });
  assert.equal(turmas.status, 200);
  assert.equal(turmas.dados[0].instrutor.nome, 'Professor');
  assert.equal(turmas.dados[0].instrutor.email, undefined);
});

test('imagem de compartilhamento do evento: usa a cópia reduzida, cai no banner, 404 sem banner', async () => {
  const tipo = await models.TipoEvento.create({ nome: 'Exame' });
  const png = Buffer.from('imagem-original').toString('base64');
  const jpg = Buffer.from('imagem-reduzida').toString('base64');
  const comCopia = await models.Evento.create({ nome: 'Exame A', data: new Date(), tipoEventoId: tipo.id, publicado: true, banner: `data:image/png;base64,${png}`, bannerCompartilhamento: `data:image/jpeg;base64,${jpg}` });
  const soBanner = await models.Evento.create({ nome: 'Exame B', data: new Date(), tipoEventoId: tipo.id, publicado: true, banner: `data:image/png;base64,${png}` });
  const semBanner = await models.Evento.create({ nome: 'Exame C', data: new Date(), tipoEventoId: tipo.id, publicado: true });

  const base = `http://127.0.0.1:${ajuda.porta()}/api/eventos`;
  const reduzida = await fetch(`${base}/${comCopia.slug}/imagem-compartilhamento`);
  assert.equal(reduzida.headers.get('content-type'), 'image/jpeg');
  assert.equal(Buffer.from(await reduzida.arrayBuffer()).toString(), 'imagem-reduzida');

  const original = await fetch(`${base}/${soBanner.id}/imagem-compartilhamento`);
  assert.equal(original.headers.get('content-type'), 'image/png');

  assert.equal((await fetch(`${base}/${semBanner.id}/imagem-compartilhamento`)).status, 404);
});
