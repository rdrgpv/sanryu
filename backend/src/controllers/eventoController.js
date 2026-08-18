const { Evento, TipoEvento, EventoAluno, Instrutor } = require('../models');
const { TIPO_EXAME_DE_FAIXA_ID } = require('../services/valorInscricaoService');
const mercadoPagoService = require('../services/mercadoPagoService');
const emailService = require('../services/emailService');
const gatameService = require('../services/gatameService');
const { qrExpirado, gerarPagamentoPix } = require('../services/pagamentoInscricaoService');
const { logErro } = require('../utils/logger');

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
    include: [
      { model: TipoEvento, as: 'tipoEvento' },
      { model: Instrutor, as: 'instrutor' },
    ],
    order: [['data', 'DESC']],
  });
  res.json(eventos);
}

async function buscarPorId(req, res) {
  const evento = await Evento.findByPk(req.params.id, {
    include: [
      { model: TipoEvento, as: 'tipoEvento' },
      { model: Instrutor, as: 'instrutor' },
    ],
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
      logErro('Erro de configuração ao consultar pagamento no Mercado Pago:', err);
      return res.status(500).json({ error: 'Erro de configuração ao consultar o Mercado Pago.' });
    }

    logErro('Erro ao consultar status do pagamento no Mercado Pago:', err);
    res.status(502).json({ error: 'Não foi possível consultar o status do pagamento agora. Tente novamente.' });
  }
}

// Cadastra um inscrito (que não veio do Gatame, ou seja, sem carteirinha já emitida por lá) como
// aluno novo no Gatame. Usa o instrutor responsável do evento como "professor" do cadastro — por
// isso exige que o evento tenha um instrutor com email definido antes de permitir a ação.
async function cadastrarComoAluno(req, res) {
  const inscricao = await EventoAluno.findByPk(req.params.id);

  if (!inscricao) {
    return res.status(404).json({ error: 'Inscrição não encontrada.' });
  }

  if (inscricao.origemDados === 'gatame') {
    return res.status(400).json({ error: 'Este inscrito já veio do Gatame — não precisa ser cadastrado.' });
  }

  if (inscricao.cadastradoNoGatame) {
    return res.status(400).json({ error: 'Este inscrito já foi cadastrado como aluno no Gatame.' });
  }

  const evento = await Evento.findByPk(inscricao.eventoId, { include: [{ model: Instrutor, as: 'instrutor' }] });

  if (!evento?.instrutor?.email) {
    return res.status(400).json({ error: 'Defina o instrutor responsável do evento (com email cadastrado) antes de cadastrar o aluno.' });
  }

  try {
    await gatameService.cadastrarAluno({
      emailProfessor: evento.instrutor.email,
      emailAluno: inscricao.email,
      nome: inscricao.nome,
      faixa: inscricao.faixaAtual || inscricao.faixa || 'Branca',
      tamanhoFaixa: inscricao.tamanhoFaixa,
      dataNascimento: inscricao.dataNascimento,
      numeroCarteirinha: inscricao.numeroCarteirinha,
      observacao: `Cadastrado via inscrição no evento "${evento.nome}".`,
    });

    await inscricao.update({ cadastradoNoGatame: true });
    res.json(inscricao);
  } catch (err) {
    if (err.interno) {
      logErro('Erro de configuração ao cadastrar aluno no Gatame:', err);
      return res.status(500).json({ error: 'Erro de configuração ao cadastrar aluno no Gatame.' });
    }

    // "aluno_duplicado" significa que o aluno já existe no Gatame — ou seja, o estado que a gente
    // queria já é verdade. Marca como cadastrado em vez de mostrar isso como uma falha.
    if (err.codigo === 'aluno_duplicado') {
      await inscricao.update({ cadastradoNoGatame: true });
      return res.json(inscricao);
    }

    if (err.status && err.status < 500) {
      return res.status(400).json({ error: err.message });
    }

    logErro('Erro ao cadastrar aluno no Gatame:', err);
    res.status(502).json({ error: 'Não foi possível cadastrar o aluno no Gatame agora. Tente novamente.' });
  }
}

// Reenvia o lembrete de pagamento pra todo mundo com statusPagamento "pendente" nesse evento. Se o
// QR code/Pix já passou das 24h de validade (o normal, já que ninguém manda lembrete minutos depois
// da inscrição), gera um novo pagamento antes de enviar — do contrário a pessoa receberia um QR
// morto. Aguarda todos os envios (diferente da confirmação na inscrição pública, que não espera) —
// aqui quem clicou é o admin, que quer saber quantos foram enviados de verdade.
async function notificarPendentes(req, res) {
  const evento = await Evento.findByPk(req.params.id);

  if (!evento) {
    return res.status(404).json({ error: 'Evento não encontrado.' });
  }

  const pendentes = await EventoAluno.findAll({ where: { eventoId: evento.id, statusPagamento: 'pendente' } });

  if (pendentes.length === 0) {
    return res.json({ enviados: 0 });
  }

  await Promise.all(
    pendentes.map(async (eventoAluno) => {
      if (Number(eventoAluno.valorCobrado) > 0 && qrExpirado(eventoAluno)) {
        const novoPagamento = await gerarPagamentoPix({ valor: eventoAluno.valorCobrado, evento, email: eventoAluno.email });
        await eventoAluno.update(novoPagamento);
      }

      await emailService.enviarLembretePagamentoPendente({ evento, eventoAluno });
    })
  );

  res.json({ enviados: pendentes.length });
}

module.exports = {
  listar,
  buscarPorId,
  criar,
  atualizar,
  remover,
  listarInscricoes,
  verificarPagamento,
  cadastrarComoAluno,
  notificarPendentes,
};
