const { Op } = require('sequelize');
const { Evento, TipoEvento, EventoAluno } = require('../models');
const gatameService = require('../services/gatameService');
const emailService = require('../services/emailService');
const { calcularValorInscricao, TIPO_EXAME_DE_FAIXA_ID } = require('../services/valorInscricaoService');
const { qrExpirado, gerarPagamentoPix } = require('../services/pagamentoInscricaoService');
const { logErro } = require('../utils/logger');

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
    tamanhoFaixa: raw.tamanho_faixa || null,
    origem: raw.origem,
    email: raw.email || null,
  };
}

// Só a origem "gatame" traz dados cadastrais confiáveis (nome/nascimento) e faixa. Nos demais
// casos, a pessoa precisa confirmar/completar esses dados manualmente na inscrição.
function precisaDadosExtras(candidato) {
  return candidato.origem !== 'gatame' || !candidato.faixa;
}

// Tamanho da faixa: quando vem do Gatame, confia no dado da integração e nunca pede de novo. Só
// pede manualmente pra quem não veio de lá (a integração ainda não cobre esses casos).
function precisaTamanhoFaixa(candidato) {
  return candidato.origem !== 'gatame';
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
    logErro('Erro de configuração ao consultar dados de carteirinha:', err);
    return res.status(500).json({ error: 'Erro interno ao consultar dados de carteirinha. Tente novamente mais tarde.' });
  }

  logErro('Erro ao consultar dados de carteirinha:', err);
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

  const { email, indice, faixaEscolhida, dadosExtras, tamanhoFaixa, gerarNovoQrCode } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email é obrigatório.' });
  }

  const existente = await EventoAluno.findOne({ where: { eventoId: evento.id, email } });

  // Um registro existente sem valor calculado (statusPagamento "pendente" e valorCobrado nulo) nunca chegou a
  // ser resolvido — ex.: a faixa ainda não estava cadastrada. Nesse caso, permite recalcular em vez de travar
  // a pessoa nesse estado para sempre.
  const pendenteSemValor = existente && existente.valorCobrado == null && existente.statusPagamento === 'pendente';

  if (existente && !pendenteSemValor) {
    if (gerarNovoQrCode) {
      if (existente.statusPagamento === 'pago') {
        return res.status(400).json({ error: 'Esta inscrição já está paga; não há QR code para gerar.', jaInscrito: true });
      }

      if (!qrExpirado(existente)) {
        return res.status(400).json({
          error: 'O QR code atual ainda está dentro do prazo de validade de 24 horas.',
          jaInscrito: true,
        });
      }

      const novoPagamento = await gerarPagamentoPix({ valor: existente.valorCobrado, evento, email });
      await existente.update({ ...novoPagamento, statusPagamento: 'pendente' });

      emailService.enviarConfirmacaoInscricao({ evento, eventoAluno: existente });

      return res.status(200).json({ ...existente.toJSON(), jaInscrito: true, qrCodeRenovado: true });
    }

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

  // Tamanho da faixa física (ex.: A1): quando vem do Gatame, usa o valor da integração direto e
  // nunca pede de novo. Só pede manualmente (e valida) pra quem não veio de lá.
  const ehExameDeFaixa = evento.tipoEvento.id === TIPO_EXAME_DE_FAIXA_ID;
  let tamanhoFaixaFinal = candidato.tamanhoFaixa || null;

  if (ehExameDeFaixa && precisaTamanhoFaixa(candidato)) {
    const tamanhoFaixaTratado = (tamanhoFaixa || '').trim().slice(0, 2).toUpperCase();

    if (!tamanhoFaixaTratado) {
      return res.status(400).json({ error: 'Informe o tamanho da faixa.', precisaTamanhoFaixa: true });
    }

    tamanhoFaixaFinal = tamanhoFaixaTratado;
  }

  // A partir daqui não há mais validação de entrada (só cálculo/gravação/pagamento) — sem esse
  // try/catch, qualquer exceção aqui (ex.: Mercado Pago/Pix, banco de dados) derrubava a promise
  // da rota sem nunca responder, e o front ficava esperando até dar timeout com uma mensagem genérica.
  try {
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
      ({ qrcodePix, pixCopiaCola, mpPaymentId } = await gerarPagamentoPix({ valor: resultadoValor.valor, evento, email }));
    }

    const dadosInscricao = {
      eventoId: evento.id,
      email,
      nome: candidato.nome,
      faixa: resultadoValor.faixaUsada || candidato.faixa,
      faixaAtual: resultadoValor.faixaAtual || candidato.faixa,
      dataNascimento: candidato.dataNascimento,
      telefone: candidato.telefone || null,
      responsavel: candidato.responsavel || null,
      numeroCarteirinha: candidato.numeroCarteirinha,
      validadeCarteirinha: candidato.validadeCarteirinha,
      tamanhoFaixa: tamanhoFaixaFinal,
      carteirinhaValida: resultadoValor.carteirinhaValida ?? null,
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
  } catch (err) {
    logErro('Erro ao processar inscrição:', err);
    res.status(500).json({ error: 'Não foi possível concluir sua inscrição. Tente novamente em instantes.' });
  }
}

module.exports = { listarPublicados, buscarPublico, consultarCarteirinha, inscrever };
