const { Op } = require('sequelize');
const { Evento, TipoEvento, Banco, EventoAluno } = require('../models');
const gatameService = require('../services/gatameService');
const pixService = require('../services/pixService');
const mercadoPagoService = require('../services/mercadoPagoService');
const emailService = require('../services/emailService');
const { calcularValorInscricao } = require('../services/valorInscricaoService');

// Rotas públicas aceitam tanto o id numérico quanto o slug amigável no mesmo parâmetro.
function whereIdOuSlug(param) {
  const comoNumero = Number(param);
  const filtros = [{ slug: param }];

  if (Number.isInteger(comoNumero) && String(comoNumero) === String(param)) {
    filtros.push({ id: comoNumero });
  }

  return { [Op.or]: filtros };
}

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

// Só a origem "gatame" traz dados cadastrais confiáveis (nome/nascimento) e faixa. Nos demais
// casos, a pessoa precisa confirmar/completar esses dados manualmente na inscrição.
function precisaDadosExtras(candidato) {
  return candidato.origem !== 'gatame' || !candidato.faixa;
}

// Extrai ano/mês/dia direto da string (formato YYYY-MM-DD, usado tanto pela API do Gatame quanto
// pelo input type="date") em vez de usar `new Date(string)`, que interpreta a data como meia-noite
// UTC e pode "voltar" um dia em fusos negativos como o do Brasil.
function calcularIdade(dataNascimento) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dataNascimento || '');

  if (!match) {
    return null;
  }

  const [, anoStr, mesStr, diaStr] = match;
  const ano = Number(anoStr);
  const mes = Number(mesStr);
  const dia = Number(diaStr);

  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  const aindaNaoFezAniversario = hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia);

  if (aindaNaoFezAniversario) {
    idade -= 1;
  }

  return idade;
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
    attributes: ['id', 'slug', 'nome', 'descricao', 'local', 'data', 'banner'],
    include: { model: TipoEvento, as: 'tipoEvento', attributes: ['nome'] },
    order: [['data', 'ASC']],
  });

  res.json(eventos);
}

async function buscarPublico(req, res) {
  const evento = await Evento.findOne({
    where: { ...whereIdOuSlug(req.params.id), publicado: true },
    attributes: ['id', 'slug', 'nome', 'descricao', 'local', 'data', 'banner'],
    include: { model: TipoEvento, as: 'tipoEvento', attributes: ['id', 'nome'] },
  });

  if (!evento) {
    return res.status(404).json({ error: 'Evento não encontrado.' });
  }

  res.json(evento);
}

async function consultarCarteirinha(req, res) {
  const evento = await Evento.findOne({ where: { ...whereIdOuSlug(req.params.id), publicado: true } });

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
    where: { ...whereIdOuSlug(req.params.id), publicado: true },
    include: { model: TipoEvento, as: 'tipoEvento' },
  });

  if (!evento) {
    return res.status(404).json({ error: 'Evento não encontrado.' });
  }

  const { email, indice, faixaEscolhida, dadosExtras } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email é obrigatório.' });
  }

  const existente = await EventoAluno.findOne({ where: { eventoId: evento.id, email } });

  // Um registro existente sem valor calculado (statusPagamento "pendente" e valorCobrado nulo) nunca chegou a
  // ser resolvido — ex.: a faixa ainda não estava cadastrada. Nesse caso, permite recalcular em vez de travar
  // a pessoa nesse estado para sempre.
  const pendenteSemValor = existente && existente.valorCobrado == null && existente.statusPagamento === 'pendente';

  if (existente && !pendenteSemValor) {
    return res.status(200).json({ ...existente.toJSON(), jaInscrito: true });
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
      error: 'Não localizamos seus dados de carteirinha. Verifique o e-mail informado ou verifique seu cadastro no Morganti University.',
    });
  }

  const idx = Number.isInteger(indice) ? indice : 0;
  const candidatoRaw = resultado.candidatos[idx];

  if (!candidatoRaw) {
    return res.status(400).json({ error: 'Seleção de cadastro inválida.' });
  }

  const candidato = mapCandidato(candidatoRaw);

  if (precisaDadosExtras(candidato)) {
    const nome = (dadosExtras?.nome || '').trim();
    const telefone = (dadosExtras?.telefone || '').trim();
    const dataNascimento = (dadosExtras?.dataNascimento || '').trim();

    if (!nome || !dataNascimento) {
      return res.status(400).json({
        error: 'Informe nome e data de nascimento para continuar.',
        precisaDadosExtras: true,
      });
    }

    const idade = calcularIdade(dataNascimento);

    if (idade === null) {
      return res.status(400).json({ error: 'Data de nascimento inválida.', precisaDadosExtras: true });
    }

    const menorDeIdade = idade < 18;
    const responsavel = (dadosExtras?.responsavel || '').trim();

    if (menorDeIdade && !responsavel) {
      return res.status(400).json({
        error: 'Para menores de idade, informe o nome do responsável.',
        precisaDadosExtras: true,
        menorDeIdade: true,
      });
    }

    candidato.nome = nome;
    candidato.dataNascimento = dataNascimento;
    candidato.telefone = telefone || null;
    candidato.responsavel = menorDeIdade ? responsavel : null;
  }

  const resultadoValor = await calcularValorInscricao({
    evento,
    tipoEvento: evento.tipoEvento,
    candidato,
    faixaEscolhida,
  });

  if (resultadoValor.erroValidacao) {
    return res.status(400).json({ error: resultadoValor.erroValidacao, opcoesFaixa: resultadoValor.opcoesFaixa });
  }

  let qrcodePix = null;
  let pixCopiaCola = null;
  let mpPaymentId = null;

  if (resultadoValor.valor && Number(resultadoValor.valor) > 0) {
    const pagamentoMp = await mercadoPagoService
      .criarPagamentoPix({
        valor: resultadoValor.valor,
        descricao: `Inscrição - ${evento.nome}`,
        email,
        referenciaExterna: `EVT${evento.id}-${Date.now()}`,
      })
      .catch((err) => {
        console.error('Erro ao criar pagamento Pix via Mercado Pago, caindo para QR estático:', err.message);
        return null;
      });

    if (pagamentoMp) {
      qrcodePix = pagamentoMp.qrcodeBase64;
      pixCopiaCola = pagamentoMp.pixCopiaCola;
      mpPaymentId = pagamentoMp.paymentId;
    } else {
      // Fallback: Mercado Pago não configurado (ou falhou) — usa a chave Pix estática de /admin/bancos.
      const banco = await Banco.findOne({ order: [['id', 'ASC']] });

      if (banco) {
        pixCopiaCola = pixService.gerarPayload({
          chavePix: banco.chavePix,
          nomeRecebedor: banco.titular,
          cidade: banco.cidade,
          valor: resultadoValor.valor,
          txid: `EVT${evento.id}${Date.now()}`,
        });
        qrcodePix = await pixService.gerarQrCodeBase64(pixCopiaCola);
      } else {
        console.error('Nenhuma configuração de conta Pix cadastrada (tabela banco); QR code não gerado.');
      }
    }
  }

  const dadosInscricao = {
    eventoId: evento.id,
    email,
    nome: candidato.nome,
    faixa: resultadoValor.faixaUsada || candidato.faixa,
    dataNascimento: candidato.dataNascimento,
    telefone: candidato.telefone || null,
    responsavel: candidato.responsavel || null,
    numeroCarteirinha: candidato.numeroCarteirinha,
    validadeCarteirinha: candidato.validadeCarteirinha,
    origemDados: candidato.origem,
    apto: true,
    valorCobrado: resultadoValor.valor,
    statusPagamento: resultadoValor.statusPagamento,
    qrcodePix,
    pixCopiaCola,
    mpPaymentId,
  };

  const eventoAluno = pendenteSemValor ? await existente.update(dadosInscricao) : await EventoAluno.create(dadosInscricao);

  // Não aguarda nem deixa falha de e-mail atrasar/derrubar a resposta — a inscrição já está concluída.
  emailService.enviarConfirmacaoInscricao({ evento, eventoAluno });

  res.status(pendenteSemValor ? 200 : 201).json({ ...eventoAluno.toJSON(), aviso: resultadoValor.aviso });
}

module.exports = { listarPublicados, buscarPublico, consultarCarteirinha, inscrever };
