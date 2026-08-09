const { Evento, TipoEvento, Banco, EventoAluno } = require('../models');
const gatameService = require('../services/gatameService');
const pixService = require('../services/pixService');
const { calcularValorInscricao } = require('../services/valorInscricaoService');

function mapCandidato(raw) {
  return {
    nome: raw.nome,
    faixa: raw.faixa || null,
    dataNascimento: raw.data_nascimento || null,
    numeroCarteirinha: raw.numero_carteirinha || null,
    validadeCarteirinha: raw.validade_carteirinha || null,
    origem: raw.origem,
    email: raw.email || null,
  };
}

function tratarErroConsulta(err, res) {
  if (err.interno) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno ao consultar dados de carteirinha. Tente novamente mais tarde.' });
  }

  console.error(err);
  return res.status(502).json({ error: 'Não foi possível consultar seus dados no momento. Tente novamente em instantes.' });
}

async function listarPublicados(req, res) {
  const eventos = await Evento.findAll({
    where: { publicado: true },
    attributes: ['id', 'nome', 'descricao', 'local', 'data'],
    include: { model: TipoEvento, as: 'tipoEvento', attributes: ['nome'] },
    order: [['data', 'ASC']],
  });

  res.json(eventos);
}

async function buscarPublico(req, res) {
  const evento = await Evento.findOne({
    where: { id: req.params.id, publicado: true },
    attributes: ['id', 'nome', 'descricao', 'local', 'data'],
  });

  if (!evento) {
    return res.status(404).json({ error: 'Evento não encontrado.' });
  }

  res.json(evento);
}

async function consultarCarteirinha(req, res) {
  const evento = await Evento.findOne({ where: { id: req.params.id, publicado: true } });

  if (!evento) {
    return res.status(404).json({ error: 'Evento não encontrado.' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email é obrigatório.' });
  }

  try {
    const resultado = await gatameService.consultarAluno(email);

    if (!resultado.apto) {
      return res.json({ apto: false });
    }

    res.json({ apto: true, candidatos: resultado.candidatos.map(mapCandidato) });
  } catch (err) {
    tratarErroConsulta(err, res);
  }
}

async function inscrever(req, res) {
  const evento = await Evento.findOne({
    where: { id: req.params.id, publicado: true },
    include: { model: TipoEvento, as: 'tipoEvento' },
  });

  if (!evento) {
    return res.status(404).json({ error: 'Evento não encontrado.' });
  }

  const { email, indice } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email é obrigatório.' });
  }

  const existente = await EventoAluno.findOne({ where: { eventoId: evento.id, email } });

  if (existente) {
    return res.status(200).json(existente);
  }

  let resultado;

  try {
    resultado = await gatameService.consultarAluno(email);
  } catch (err) {
    return tratarErroConsulta(err, res);
  }

  if (!resultado.apto) {
    return res.status(404).json({
      apto: false,
      error: 'Não localizamos seus dados de carteirinha. Verifique o e-mail informado ou entre em contato com o dojo.',
    });
  }

  const idx = Number.isInteger(indice) ? indice : 0;
  const candidatoRaw = resultado.candidatos[idx];

  if (!candidatoRaw) {
    return res.status(400).json({ error: 'Seleção de cadastro inválida.' });
  }

  const candidato = mapCandidato(candidatoRaw);
  const resultadoValor = await calcularValorInscricao({ evento, tipoEvento: evento.tipoEvento, candidato });

  let qrcodePix = null;

  if (resultadoValor.valor && Number(resultadoValor.valor) > 0) {
    const banco = await Banco.findOne({ order: [['id', 'ASC']] });

    if (banco) {
      const payload = pixService.gerarPayload({
        chavePix: banco.chavePix,
        nomeRecebedor: banco.titular,
        cidade: process.env.PIX_CIDADE || 'SAO PAULO',
        valor: resultadoValor.valor,
        txid: `EVT${evento.id}${Date.now()}`,
      });
      qrcodePix = await pixService.gerarQrCodeBase64(payload);
    } else {
      console.error('Nenhuma configuração de conta Pix cadastrada (tabela banco); QR code não gerado.');
    }
  }

  const eventoAluno = await EventoAluno.create({
    eventoId: evento.id,
    email,
    nome: candidato.nome,
    faixa: candidato.faixa,
    dataNascimento: candidato.dataNascimento,
    numeroCarteirinha: candidato.numeroCarteirinha,
    validadeCarteirinha: candidato.validadeCarteirinha,
    origemDados: candidato.origem,
    apto: true,
    valorCobrado: resultadoValor.valor,
    statusPagamento: resultadoValor.statusPagamento,
    qrcodePix,
  });

  res.status(201).json({ ...eventoAluno.toJSON(), aviso: resultadoValor.aviso });
}

module.exports = { listarPublicados, buscarPublico, consultarCarteirinha, inscrever };
