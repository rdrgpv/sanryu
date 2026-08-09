const { Evento, TipoEvento, EventoAluno } = require('../models');
const { TIPO_EXAME_DE_FAIXA_ID } = require('../services/valorInscricaoService');

// Aplica a regra de valor do item 2: só é permitido usar o campo "valor" do evento
// quando o tipo é cobrável e diferente de Exame de Faixa (cujo valor vem da faixa).
async function aplicarRegraValor(dados) {
  const tipoEvento = await TipoEvento.findByPk(dados.tipoEventoId);

  if (!tipoEvento) {
    throw new Error('Tipo de evento inválido.');
  }

  const podeUsarValorProprio = tipoEvento.cobravel && tipoEvento.id !== TIPO_EXAME_DE_FAIXA_ID;

  return { ...dados, valor: podeUsarValorProprio ? dados.valor ?? null : null };
}

async function listar(req, res) {
  const eventos = await Evento.findAll({
    include: { model: TipoEvento, as: 'tipoEvento' },
    order: [['data', 'DESC']],
  });
  res.json(eventos);
}

async function buscarPorId(req, res) {
  const evento = await Evento.findByPk(req.params.id, {
    include: { model: TipoEvento, as: 'tipoEvento' },
  });

  if (!evento) {
    return res.status(404).json({ error: 'Evento não encontrado.' });
  }

  res.json(evento);
}

async function criar(req, res) {
  try {
    const payload = await aplicarRegraValor(req.body);
    const evento = await Evento.create(payload);
    res.status(201).json(evento);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function atualizar(req, res) {
  const evento = await Evento.findByPk(req.params.id);

  if (!evento) {
    return res.status(404).json({ error: 'Evento não encontrado.' });
  }

  try {
    const payload = await aplicarRegraValor({ ...evento.toJSON(), ...req.body });
    await evento.update(payload);
    res.json(evento);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remover(req, res) {
  const evento = await Evento.findByPk(req.params.id);

  if (!evento) {
    return res.status(404).json({ error: 'Evento não encontrado.' });
  }

  await evento.destroy();
  res.status(204).send();
}

async function listarInscricoes(req, res) {
  const evento = await Evento.findByPk(req.params.id);

  if (!evento) {
    return res.status(404).json({ error: 'Evento não encontrado.' });
  }

  const inscricoes = await EventoAluno.findAll({
    where: { eventoId: evento.id },
    order: [['createdAt', 'DESC']],
  });

  res.json(inscricoes);
}

module.exports = { listar, buscarPorId, criar, atualizar, remover, listarInscricoes };
