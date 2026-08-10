const { Evento, TipoEvento, EventoAluno } = require('../models');
const { TIPO_EXAME_DE_FAIXA_ID } = require('../services/valorInscricaoService');
const mercadoPagoService = require('../services/mercadoPagoService');

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

async function verificarPagamento(req, res) {
  const inscricao = await EventoAluno.findByPk(req.params.id);

  if (!inscricao) {
    return res.status(404).json({ error: 'Inscrição não encontrada.' });
  }

  if (!inscricao.mpPaymentId) {
    return res.status(400).json({ error: 'Esta inscrição não possui um pagamento via Mercado Pago associado.' });
  }

  try {
    const resultado = await mercadoPagoService.consultarPagamento(inscricao.mpPaymentId);

    if (resultado.statusPagamento !== inscricao.statusPagamento) {
      await inscricao.update({ statusPagamento: resultado.statusPagamento });
    }

    res.json(inscricao);
  } catch (err) {
    if (err.interno) {
      console.error(err);
      return res.status(500).json({ error: 'Erro de configuração ao consultar o Mercado Pago.' });
    }

    console.error(err);
    res.status(502).json({ error: 'Não foi possível consultar o status do pagamento agora. Tente novamente.' });
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, remover, listarInscricoes, verificarPagamento };
