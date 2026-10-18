const crypto = require('crypto');
const { Op } = require('sequelize');
const { Contrato, Aluno, Plano, Unidade, Mensalidade } = require('../models');
const { calcularValores, contratante, carregarContratoCompleto, montarTermo } = require('../services/contratoService');
const { logErro } = require('../utils/logger');

const TAMANHO_MAXIMO_ASSINATURA = 1024 * 1024;

function hoje() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
}

// Valida aluno/plano/vencimento/bolsa e devolve os dados prontos pra gravar (com valores calculados).
async function montarDados(body, contratoExistente = null) {
  const aluno = await Aluno.findByPk(body.alunoId ?? contratoExistente?.alunoId);
  if (!aluno) return { erro: 'Aluno não encontrado.' };
  if (aluno.vinculo === 'externo') return { erro: 'Aluno Morganti externo: torne-o aluno da academia antes de fazer contrato.' };

  const plano = await Plano.findByPk(body.planoId ?? contratoExistente?.planoId);
  if (!plano) return { erro: 'Plano não encontrado.' };
  if (!plano.ativo && plano.id !== contratoExistente?.planoId) return { erro: 'Este plano está desativado.' };
  if (plano.unidadeId && plano.unidadeId !== aluno.unidadeId) return { erro: 'Este plano não vale para a unidade do aluno.' };

  const diaVencimento = Number(body.diaVencimento ?? contratoExistente?.diaVencimento);
  if (!Number.isInteger(diaVencimento) || diaVencimento < 1 || diaVencimento > 28) {
    return { erro: 'O dia de vencimento deve ser entre 1 e 28.' };
  }

  const bolsaPercentual = Number(body.bolsaPercentual ?? contratoExistente?.bolsaPercentual ?? 0);
  const motivoBolsa = (body.motivoBolsa ?? contratoExistente?.motivoBolsa ?? '').trim();
  if (bolsaPercentual > 0 && !motivoBolsa) return { erro: 'Informe o motivo da bolsa.' };

  const valores = await calcularValores({ aluno, plano, bolsaPercentual, contratoIdIgnorado: contratoExistente?.id });

  return {
    aluno,
    dados: {
      alunoId: aluno.id,
      planoId: plano.id,
      dataInicio: body.dataInicio || contratoExistente?.dataInicio || hoje(),
      diaVencimento,
      ...valores,
      motivoBolsa: valores.bolsaPercentual > 0 ? motivoBolsa : null,
      observacoes: (body.observacoes ?? contratoExistente?.observacoes ?? '').trim() || null,
    },
  };
}

async function listar(req, res) {
  const { situacao, alunoId, unidadeId } = req.query;
  const where = {};
  if (situacao) where.situacao = situacao;
  if (alunoId) where.alunoId = alunoId;

  const contratos = await Contrato.findAll({
    where,
    attributes: { exclude: ['assinatura', 'termoAssinado'] },
    include: [
      {
        model: Aluno,
        as: 'aluno',
        attributes: ['id', 'nome', 'unidadeId'],
        where: unidadeId ? { unidadeId } : undefined,
        include: { model: Unidade, as: 'unidade', attributes: ['id', 'nome'] },
      },
      { model: Plano, as: 'plano', attributes: ['id', 'nome', 'periodicidade'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  res.json(contratos);
}

async function buscarPorId(req, res) {
  const contrato = await carregarContratoCompleto({ id: req.params.id });

  if (!contrato) {
    return res.status(404).json({ error: 'Contrato não encontrado.' });
  }

  const termo = contrato.assinadoEm ? contrato.termoAssinado : await montarTermo(contrato);
  res.json({ ...contrato.toJSON(), termo, contratante: contratante(contrato.aluno) });
}

// Prévia dos valores (com desconto família/bolsa) pro formulário, sem gravar nada.
async function simular(req, res) {
  const contratoExistente = req.body.contratoId ? await Contrato.findByPk(req.body.contratoId) : null;
  const resultado = await montarDados(req.body, contratoExistente);

  if (resultado.erro) {
    return res.status(400).json({ error: resultado.erro });
  }

  res.json(resultado.dados);
}

async function criar(req, res) {
  const resultado = await montarDados(req.body);

  if (resultado.erro) {
    return res.status(400).json({ error: resultado.erro });
  }

  const ativo = await Contrato.findOne({ where: { alunoId: resultado.aluno.id, situacao: 'ativo' } });

  if (ativo) {
    return res.status(400).json({ error: 'Este aluno já tem um contrato ativo. Encerre o atual antes de criar outro.' });
  }

  try {
    const contrato = await Contrato.create({ ...resultado.dados, tokenAssinatura: crypto.randomBytes(24).toString('hex') });
    res.status(201).json(contrato);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Depois de assinado, as condições ficam travadas — pra mudar plano/valor, encerra e faz outro.
async function atualizar(req, res) {
  const contrato = await Contrato.findByPk(req.params.id);

  if (!contrato) {
    return res.status(404).json({ error: 'Contrato não encontrado.' });
  }

  if (contrato.assinadoEm) {
    await contrato.update({ observacoes: (req.body.observacoes || '').trim() || null });
    return res.json(contrato);
  }

  const resultado = await montarDados({ ...req.body, alunoId: contrato.alunoId }, contrato);

  if (resultado.erro) {
    return res.status(400).json({ error: resultado.erro });
  }

  await contrato.update(resultado.dados);
  res.json(contrato);
}

async function encerrar(req, res) {
  const contrato = await Contrato.findByPk(req.params.id);

  if (!contrato) {
    return res.status(404).json({ error: 'Contrato não encontrado.' });
  }

  const situacao = req.body.situacao === 'cancelado' ? 'cancelado' : 'encerrado';
  const dataFim = req.body.dataFim || hoje();
  await contrato.update({ situacao, dataFim });

  // Cobranças em aberto que vencem depois do fim não fazem mais sentido.
  const [canceladas] = await Mensalidade.update(
    { status: 'cancelado', observacoes: 'Cancelada no encerramento do contrato.' },
    { where: { contratoId: contrato.id, status: 'pendente', vencimento: { [Op.gt]: dataFim } } }
  );

  // Desconto família é calculado na criação do contrato: se este era o único irmão ativo, o(s)
  // outro(s) continua(m) com desconto — avisa o admin pra decidir se refaz o contrato deles.
  const aluno = await Aluno.findByPk(contrato.alunoId, { attributes: ['responsavelId'] });
  let irmaosComDescontoSemIrmao = [];

  if (aluno?.responsavelId) {
    const ativosDaFamilia = await Contrato.findAll({
      where: { situacao: 'ativo' },
      include: { model: Aluno, as: 'aluno', where: { responsavelId: aluno.responsavelId }, attributes: ['id', 'nome'] },
    });

    if (ativosDaFamilia.length === 1 && Number(ativosDaFamilia[0].descontoFamiliaPercentual) > 0) {
      irmaosComDescontoSemIrmao = ativosDaFamilia.map((item) => item.aluno.nome);
    }
  }

  res.json({ ...contrato.toJSON(), mensalidadesCanceladas: canceladas, irmaosComDescontoSemIrmao });
}

// Excluir só antes de assinar (ex.: criado por engano) — assinado vira histórico, só encerra.
async function remover(req, res) {
  const contrato = await Contrato.findByPk(req.params.id);

  if (!contrato) {
    return res.status(404).json({ error: 'Contrato não encontrado.' });
  }

  if (contrato.assinadoEm) {
    return res.status(400).json({ error: 'Contrato já assinado não pode ser excluído. Encerre ou cancele.' });
  }

  await contrato.destroy();
  res.status(204).send();
}

async function registrarAssinatura(contrato, { assinatura, nomeAssinante, autorizaReconhecimentoFacial }, via, ip) {
  const nome = (nomeAssinante || '').trim();

  if (!nome) return 'Informe o nome de quem está assinando.';
  if (typeof assinatura !== 'string' || !assinatura.startsWith('data:image/png;base64,') || assinatura.length > TAMANHO_MAXIMO_ASSINATURA) {
    return 'Assinatura inválida. Assine novamente no quadro.';
  }
  if (contrato.situacao !== 'ativo') return 'Este contrato não está mais ativo.';
  if (contrato.assinadoEm) return 'Este contrato já foi assinado.';

  await contrato.update({
    assinatura,
    nomeAssinante: nome,
    termoAssinado: await montarTermo(contrato),
    assinadoEm: new Date(),
    assinadoVia: via,
    ipAssinatura: ip || null,
  });

  // Opcional e separado do contrato (consentimento específico, LGPD art. 11) — só liga, nunca
  // desliga: quem não marcou não perde uma autorização dada antes por escrito.
  if (autorizaReconhecimentoFacial === true) {
    await Aluno.update(
      { consentimentoBiometria: true, consentimentoBiometriaEm: new Date(), consentimentoBiometriaOrigem: 'contrato' },
      { where: { id: contrato.alunoId, consentimentoBiometria: false } }
    );
  }

  return null;
}

async function assinarRecepcao(req, res) {
  const contrato = await carregarContratoCompleto({ id: req.params.id });

  if (!contrato) {
    return res.status(404).json({ error: 'Contrato não encontrado.' });
  }

  try {
    const erro = await registrarAssinatura(contrato, req.body, 'recepcao', req.ip);
    if (erro) return res.status(400).json({ error: erro });
    res.json({ assinadoEm: contrato.assinadoEm });
  } catch (err) {
    logErro('Erro ao assinar contrato na recepção:', err);
    res.status(500).json({ error: 'Não foi possível registrar a assinatura.' });
  }
}

// ---- Rotas públicas (link de assinatura) ----

async function buscarPublico(req, res) {
  const contrato = await carregarContratoCompleto({ tokenAssinatura: req.params.token });

  if (!contrato || contrato.situacao === 'cancelado') {
    return res.status(404).json({ error: 'Contrato não encontrado.' });
  }

  res.json({
    aluno: contrato.aluno.nome,
    unidade: contrato.aluno.unidade?.nome || null,
    plano: contrato.plano.nome,
    periodicidade: contrato.plano.periodicidade,
    valorPlano: contrato.valorPlano,
    descontoFamiliaPercentual: contrato.descontoFamiliaPercentual,
    bolsaPercentual: contrato.bolsaPercentual,
    valorFinal: contrato.valorFinal,
    diaVencimento: contrato.diaVencimento,
    dataInicio: contrato.dataInicio,
    situacao: contrato.situacao,
    termo: contrato.assinadoEm ? contrato.termoAssinado : await montarTermo(contrato),
    assinado: Boolean(contrato.assinadoEm),
    assinadoEm: contrato.assinadoEm,
    nomeAssinante: contrato.nomeAssinante || contratante(contrato.aluno).nome,
  });
}

async function assinarPublico(req, res) {
  const contrato = await carregarContratoCompleto({ tokenAssinatura: req.params.token });

  if (!contrato || contrato.situacao === 'cancelado') {
    return res.status(404).json({ error: 'Contrato não encontrado.' });
  }

  try {
    const erro = await registrarAssinatura(contrato, req.body, 'link', req.ip);
    if (erro) return res.status(400).json({ error: erro });
    res.json({ assinadoEm: contrato.assinadoEm, nomeAssinante: contrato.nomeAssinante });
  } catch (err) {
    logErro('Erro ao assinar contrato pelo link:', err);
    res.status(500).json({ error: 'Não foi possível registrar a assinatura. Tente novamente.' });
  }
}

module.exports = {
  listar,
  buscarPorId,
  simular,
  criar,
  atualizar,
  encerrar,
  remover,
  assinarRecepcao,
  buscarPublico,
  assinarPublico,
};
