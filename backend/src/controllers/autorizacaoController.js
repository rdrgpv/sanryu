const { Op } = require('sequelize');
const { Evento, EventoAutorizacao, Turma } = require('../models');
const { TERMO_AUTORIZACAO } = require('../utils/termoAutorizacao');
const { logErro } = require('../utils/logger');

// Assinatura de dedo num canvas de celular dá algumas dezenas de KB em PNG; o limite só barra
// envios absurdos (o express.json já corta em 6mb).
const TAMANHO_MAXIMO_ASSINATURA = 1024 * 1024;

// Rotas públicas aceitam tanto o id numérico quanto o slug amigável no mesmo parâmetro.
function whereIdOuSlug(param) {
  const comoNumero = Number(param);
  const filtros = [{ slug: param }];

  if (Number.isInteger(comoNumero) && String(comoNumero) === String(param)) {
    filtros.push({ id: comoNumero });
  }

  return { [Op.or]: filtros };
}

// Texto da turma no combo da página pública e na cópia gravada na autorização (ex.: "Kids — seg, qua · 18:00–19:00").
function descricaoTurma(turma) {
  const dias = (turma.diaSemana || '').split(',').map((dia) => dia.trim()).filter(Boolean).join(', ');
  return `${turma.nome} — ${dias} · ${turma.horaInicio}–${turma.horaFim}`;
}

async function buscarPublico(req, res) {
  const evento = await Evento.findOne({
    where: { ...whereIdOuSlug(req.params.id), publicado: true },
    attributes: ['id', 'slug', 'nome', 'local', 'data'],
  });

  if (!evento) {
    return res.status(404).json({ error: 'Evento não encontrado.' });
  }

  const turmas = await Turma.findAll({ order: [['nome', 'ASC']] });

  res.json({
    evento,
    termo: TERMO_AUTORIZACAO,
    turmas: turmas.map((turma) => ({ id: turma.id, descricao: descricaoTurma(turma) })),
  });
}

async function criar(req, res) {
  const evento = await Evento.findOne({ where: { ...whereIdOuSlug(req.params.id), publicado: true } });

  if (!evento) {
    return res.status(404).json({ error: 'Evento não encontrado.' });
  }

  const nomeAluno = (req.body.nomeAluno || '').trim();
  const faixa = (req.body.faixa || '').trim();
  const nomeResponsavel = (req.body.nomeResponsavel || '').trim();
  const idade = Number(req.body.idade);
  const assinatura = req.body.assinatura || '';

  if (!nomeAluno || !faixa || !nomeResponsavel) {
    return res.status(400).json({ error: 'Preencha nome do aluno, faixa e nome do responsável.' });
  }

  const turmaId = Number(req.body.turmaId);
  const turma = Number.isInteger(turmaId) ? await Turma.findByPk(turmaId) : null;

  if (!turma) {
    return res.status(400).json({ error: 'Selecione a turma.' });
  }

  if (!Number.isInteger(idade) || idade < 1 || idade > 120) {
    return res.status(400).json({ error: 'Informe uma idade válida.' });
  }

  if (!assinatura.startsWith('data:image/png;base64,') || assinatura.length > TAMANHO_MAXIMO_ASSINATURA) {
    return res.status(400).json({ error: 'Assinatura inválida. Assine novamente no quadro.' });
  }

  try {
    const autorizacao = await EventoAutorizacao.create({
      eventoId: evento.id,
      nomeAluno,
      faixa,
      idade,
      turmaId: turma.id,
      turma: descricaoTurma(turma),
      nomeResponsavel,
      assinatura,
      termo: TERMO_AUTORIZACAO,
      ip: req.ip || null,
    });

    res.status(201).json({
      id: autorizacao.id,
      nomeAluno,
      faixa,
      idade,
      turma: autorizacao.turma,
      nomeResponsavel,
      createdAt: autorizacao.createdAt,
    });
  } catch (err) {
    logErro('Erro ao gravar autorização do responsável:', err);
    res.status(500).json({ error: 'Não foi possível enviar a autorização. Tente novamente em instantes.' });
  }
}

async function listar(req, res) {
  const evento = await Evento.findByPk(req.params.id);

  if (!evento) {
    return res.status(404).json({ error: 'Evento não encontrado.' });
  }

  const autorizacoes = await EventoAutorizacao.findAll({
    where: { eventoId: evento.id },
    order: [['nomeAluno', 'ASC']],
  });

  res.json(autorizacoes);
}

async function remover(req, res) {
  const autorizacao = await EventoAutorizacao.findByPk(req.params.id);

  if (!autorizacao) {
    return res.status(404).json({ error: 'Autorização não encontrada.' });
  }

  await autorizacao.destroy();
  res.status(204).send();
}

module.exports = { buscarPublico, criar, listar, remover };
