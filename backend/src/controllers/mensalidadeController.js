const { Op } = require('sequelize');
const { Mensalidade, Aluno, Responsavel, Contrato, Plano, Unidade } = require('../models');
const mensalidadeService = require('../services/mensalidadeService');
const mercadoPagoService = require('../services/mercadoPagoService');
const { logErro } = require('../utils/logger');

const FORMAS_MANUAIS = ['dinheiro', 'cartao', 'transferencia', 'pix', 'outro'];

const INCLUDES = [
  {
    model: Aluno,
    as: 'aluno',
    attributes: ['id', 'nome', 'email', 'telefone', 'unidadeId'],
    include: [
      { model: Responsavel, as: 'responsavel', attributes: ['id', 'nome', 'email', 'telefone'] },
      { model: Unidade, as: 'unidade', attributes: ['id', 'nome'] },
    ],
  },
  { model: Contrato, as: 'contrato', attributes: ['id', 'planoId'], include: { model: Plano, as: 'plano', attributes: ['id', 'nome', 'periodicidade'] } },
];

// Acrescenta o que a tela precisa e não está gravado: valor do dia (com multa/juros), se está
// vencida e o link público de pagamento.
async function comCalculados(mensalidade) {
  const json = mensalidade.toJSON();
  delete json.qrcodePix;
  const atualizado = mensalidade.status === 'pendente' ? await mensalidadeService.valorAtualizado(mensalidade) : null;

  return {
    ...json,
    vencida: mensalidade.status === 'pendente' && mensalidade.vencimento < mensalidadeService.hoje(),
    valorAtualizado: atualizado?.total ?? null,
    diasAtraso: atualizado?.diasAtraso ?? 0,
    link: await mensalidadeService.urlPagamento(mensalidade),
  };
}

async function listar(req, res) {
  const { status, competencia, alunoId, contratoId, unidadeId } = req.query;
  const where = {};
  const hoje = mensalidadeService.hoje();

  if (status === 'vencida') {
    where.status = 'pendente';
    where.vencimento = { [Op.lt]: hoje };
  } else if (status === 'a_vencer') {
    where.status = 'pendente';
    where.vencimento = { [Op.gte]: hoje };
  } else if (status) {
    where.status = status;
  }

  if (competencia) where.competencia = competencia;
  if (alunoId) where.alunoId = alunoId;
  if (contratoId) where.contratoId = contratoId;

  const includes = INCLUDES.map((include) =>
    include.as === 'aluno' && unidadeId ? { ...include, where: { unidadeId } } : include
  );

  const mensalidades = await Mensalidade.findAll({ where, include: includes, order: [['vencimento', 'ASC'], ['id', 'ASC']] });
  res.json(await Promise.all(mensalidades.map(comCalculados)));
}

async function buscarMensalidade(req, res) {
  const mensalidade = await Mensalidade.findByPk(req.params.id, { include: INCLUDES });
  if (!mensalidade) res.status(404).json({ error: 'Mensalidade não encontrada.' });
  return mensalidade;
}

async function gerar(req, res) {
  try {
    const criadas = await mensalidadeService.gerarMensalidades();
    res.json({ geradas: criadas.length });
  } catch (err) {
    logErro('Erro ao gerar mensalidades:', err);
    res.status(500).json({ error: 'Não foi possível gerar as mensalidades.' });
  }
}

// Baixa manual (dinheiro, maquininha, transferência, ou Pix recebido fora do sistema).
async function registrarPagamento(req, res) {
  const mensalidade = await buscarMensalidade(req, res);
  if (!mensalidade) return;

  if (mensalidade.status !== 'pendente') {
    return res.status(400).json({ error: 'Esta mensalidade não está em aberto.' });
  }

  const formaPagamento = req.body.formaPagamento;
  const valorPago = Number(req.body.valorPago);

  if (!FORMAS_MANUAIS.includes(formaPagamento)) {
    return res.status(400).json({ error: 'Forma de pagamento inválida.' });
  }

  if (!Number.isFinite(valorPago) || valorPago < 0) {
    return res.status(400).json({ error: 'Informe o valor recebido.' });
  }

  // Se havia um Pix em aberto, cancela pra não pagarem de novo pelo QR.
  if (mensalidade.mpPaymentId) {
    mercadoPagoService.cancelarPagamento(mensalidade.mpPaymentId).catch(() => {});
  }

  await mensalidadeService.darBaixa(mensalidade, {
    valorPago,
    formaPagamento,
    pagoEm: req.body.pagoEm ? new Date(`${req.body.pagoEm}T12:00:00-03:00`) : new Date(),
    observacoes: (req.body.observacoes || '').trim() || mensalidade.observacoes,
  });

  res.json(await comCalculados(mensalidade));
}

// Desfaz uma baixa lançada errado — volta pra em aberto.
async function reabrir(req, res) {
  const mensalidade = await buscarMensalidade(req, res);
  if (!mensalidade) return;

  if (mensalidade.status === 'pendente') {
    return res.status(400).json({ error: 'Esta mensalidade já está em aberto.' });
  }

  await mensalidade.update({ status: 'pendente', valorPago: null, pagoEm: null, formaPagamento: null });
  res.json(await comCalculados(mensalidade));
}

async function cancelar(req, res) {
  const mensalidade = await buscarMensalidade(req, res);
  if (!mensalidade) return;

  if (mensalidade.status !== 'pendente') {
    return res.status(400).json({ error: 'Só dá para cancelar mensalidade em aberto.' });
  }

  if (mensalidade.mpPaymentId) {
    mercadoPagoService.cancelarPagamento(mensalidade.mpPaymentId).catch(() => {});
  }

  await mensalidade.update({ status: 'cancelado', observacoes: (req.body.motivo || '').trim() || mensalidade.observacoes });
  res.json(await comCalculados(mensalidade));
}

async function verificarPagamento(req, res) {
  const mensalidade = await buscarMensalidade(req, res);
  if (!mensalidade) return;

  if (!mensalidade.mpPaymentId) {
    return res.status(400).json({ error: 'Esta mensalidade não tem Pix do Mercado Pago gerado (o responsável ainda não abriu o link, ou o Pix é o QR estático).' });
  }

  try {
    await mensalidadeService.processarPagamentoMercadoPago(mensalidade.mpPaymentId);
    await mensalidade.reload();
    res.json(await comCalculados(mensalidade));
  } catch (err) {
    logErro('Erro ao verificar Pix da mensalidade:', err);
    res.status(502).json({ error: 'Não foi possível consultar o Mercado Pago agora.' });
  }
}

async function enviarEmail(req, res) {
  const mensalidade = await buscarMensalidade(req, res);
  if (!mensalidade) return;

  if (mensalidade.status !== 'pendente') {
    return res.status(400).json({ error: 'Esta mensalidade não está em aberto.' });
  }

  const hoje = mensalidadeService.hoje();
  const tipo = mensalidade.vencimento < hoje ? 'atraso' : mensalidade.vencimento === hoje ? 'vencimento' : 'cobranca';
  const enviado = await mensalidadeService.enviarAviso(mensalidade, tipo);

  if (!enviado) {
    return res.status(400).json({ error: 'E-mail não enviado: sem e-mail do responsável/aluno, ou SMTP não configurado.' });
  }

  res.json({ enviado: true });
}

// ---- Link público de pagamento ----

async function buscarPublico(req, res) {
  const mensalidade = await Mensalidade.findOne({ where: { token: req.params.token }, include: INCLUDES });

  if (!mensalidade || mensalidade.status === 'cancelado') {
    return res.status(404).json({ error: 'Cobrança não encontrada.' });
  }

  const resposta = {
    aluno: mensalidade.aluno.nome,
    plano: mensalidade.contrato?.plano?.nome || null,
    competencia: mensalidade.competencia,
    vencimento: mensalidade.vencimento,
    status: mensalidade.status,
    pagoEm: mensalidade.pagoEm,
  };

  if (mensalidade.status !== 'pendente') {
    return res.json(resposta);
  }

  try {
    const valores = await mensalidadeService.valorAtualizado(mensalidade);
    await mensalidadeService.obterPix(mensalidade, { aluno: mensalidade.aluno });
    res.json({
      ...resposta,
      ...valores,
      qrcodePix: mensalidade.qrcodePix,
      pixCopiaCola: mensalidade.pixCopiaCola,
      pixExpiraEm: mensalidade.pixExpiraEm,
      baixaAutomatica: Boolean(mensalidade.mpPaymentId),
    });
  } catch (err) {
    logErro('Erro ao preparar Pix da mensalidade:', err);
    res.status(500).json({ error: 'Não foi possível gerar o Pix agora. Tente novamente em instantes.' });
  }
}

// Consultado pela página a cada poucos segundos pra mostrar "pagamento confirmado" sozinha.
async function statusPublico(req, res) {
  const mensalidade = await Mensalidade.findOne({ where: { token: req.params.token }, attributes: ['status', 'pagoEm'] });

  if (!mensalidade) {
    return res.status(404).json({ error: 'Cobrança não encontrada.' });
  }

  res.json({ status: mensalidade.status, pagoEm: mensalidade.pagoEm });
}

module.exports = {
  listar,
  gerar,
  registrarPagamento,
  reabrir,
  cancelar,
  verificarPagamento,
  enviarEmail,
  buscarPublico,
  statusPublico,
};
