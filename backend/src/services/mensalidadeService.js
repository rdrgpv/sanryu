const crypto = require('crypto');
const { Op } = require('sequelize');
const { Mensalidade, Contrato, Aluno, Plano, Responsavel, Banco, EventoAluno } = require('../models');
const mercadoPagoService = require('./mercadoPagoService');
const pixService = require('./pixService');
const emailService = require('./emailService');
const configService = require('./configService');
const { obterConfiguracao } = require('./contratoService');
const { logErro } = require('../utils/logger');

const FUSO = 'America/Sao_Paulo';
const PREFIXO_REFERENCIA = 'MEN';
const DIAS_AVISO_ATRASO = 3;

// ---- Datas: tudo em "YYYY-MM-DD" no fuso de Brasília, sem new Date(string) (que vira UTC). ----

function hoje() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: FUSO });
}

function partes(data) {
  const [ano, mes, dia] = data.split('-').map(Number);
  return { ano, mes, dia };
}

function montarData(ano, mes, dia) {
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.toISOString().slice(0, 10);
}

function somarDias(data, dias) {
  const { ano, mes, dia } = partes(data);
  return montarData(ano, mes, dia + dias);
}

// diaVencimento vai até 28, então todo mês tem esse dia — somar meses nunca "pula" de mês.
function somarMeses(data, meses) {
  const { ano, mes, dia } = partes(data);
  return montarData(ano, mes + meses, dia);
}

function diasEntre(inicio, fim) {
  return Math.round((Date.parse(`${fim}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`)) / 86400000);
}

// Primeiro vencimento: o dia escolhido no mesmo mês do início, ou no mês seguinte se já passou.
function primeiroVencimento(dataInicio, diaVencimento) {
  const { ano, mes, dia } = partes(dataInicio);
  return dia <= diaVencimento ? montarData(ano, mes, diaVencimento) : montarData(ano, mes + 1, diaVencimento);
}

function arredondar(valor) {
  return Math.round(valor * 100) / 100;
}

function formatarMoeda(valor) {
  return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
}

function formatarData(data) {
  const { ano, mes, dia } = partes(data);
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;
}

// ---- Valor ----

// Multa fixa no primeiro dia de atraso + juros pro rata dia (juros mensal / 30 por dia). O atraso
// conta a partir do vencimento — ou da data em que a cobrança foi gerada, se for depois (contrato
// lançado com início no passado: ninguém pode estar atrasado com uma cobrança que nem existia).
async function valorAtualizado(mensalidade, dataReferencia = hoje()) {
  const valor = Number(mensalidade.valor);
  const geradaEm = mensalidade.createdAt ? new Date(mensalidade.createdAt).toLocaleDateString('sv-SE', { timeZone: FUSO }) : null;
  const inicioAtraso = geradaEm && geradaEm > mensalidade.vencimento ? geradaEm : mensalidade.vencimento;
  const diasAtraso = Math.max(0, diasEntre(inicioAtraso, dataReferencia));

  if (diasAtraso === 0) {
    return { valor, multa: 0, juros: 0, total: valor, diasAtraso };
  }

  const configuracao = await obterConfiguracao();
  const multa = arredondar((valor * Number(configuracao.multaPercentual)) / 100);
  const juros = arredondar((valor * Number(configuracao.jurosMensalPercentual) * diasAtraso) / 100 / 30);
  return { valor, multa, juros, total: arredondar(valor + multa + juros), diasAtraso };
}

// ---- Geração ----

// Garante que cada contrato ativo tenha suas cobranças criadas até `diasAntecedenciaCobranca` dias
// à frente. Idempotente: o índice único (contrato + competência) impede duplicar, e o loop só cria
// o que falta — pode rodar quantas vezes quiser.
async function gerarMensalidades(dataReferencia = hoje()) {
  const configuracao = await obterConfiguracao();
  const limite = somarDias(dataReferencia, configuracao.diasAntecedenciaCobranca);
  const contratos = await Contrato.findAll({ where: { situacao: 'ativo' }, include: { model: Plano, as: 'plano' } });
  const criadas = [];

  for (const contrato of contratos) {
    const meses = Plano.MESES_POR_PERIODICIDADE[contrato.plano.periodicidade] || 1;
    let vencimento = primeiroVencimento(contrato.dataInicio, contrato.diaVencimento);

    while (vencimento <= limite && (!contrato.dataFim || vencimento <= contrato.dataFim)) {
      const [mensalidade, criada] = await Mensalidade.findOrCreate({
        where: { contratoId: contrato.id, competencia: vencimento.slice(0, 7) },
        defaults: {
          alunoId: contrato.alunoId,
          vencimento,
          valor: contrato.valorFinal,
          token: crypto.randomBytes(24).toString('hex'),
          // Bolsa de 100%: nasce paga, sem cobrar nem mandar e-mail.
          ...(Number(contrato.valorFinal) === 0 ? { status: 'pago', valorPago: 0, pagoEm: new Date(), formaPagamento: 'isento' } : {}),
        },
      });

      if (criada) criadas.push(mensalidade);
      vencimento = somarMeses(vencimento, meses);
    }
  }

  return criadas;
}

// ---- Pix ----

// Fim do dia (Brasília) em que o Pix deixa de valer: até o vencimento o valor é fixo, então vale
// até lá; depois disso os juros mudam todo dia, então vale só até o fim de hoje. Sempre com pelo
// menos 1h de folga (o MP recusa expiração muito próxima).
function expiracaoPix(mensalidade) {
  const dia = mensalidade.vencimento >= hoje() ? mensalidade.vencimento : hoje();
  const fimDoDia = new Date(`${dia}T23:59:59-03:00`);
  const minimo = new Date(Date.now() + 60 * 60 * 1000);
  return fimDoDia > minimo ? fimDoDia : minimo;
}

// Devolve o Pix pra pagar agora — reaproveita o atual se ainda vale e é do valor certo; senão gera
// outro (cancelando o anterior no MP, pra ninguém pagar o valor velho). Sem Mercado Pago
// configurado, cai pro QR estático da chave em /admin/bancos (aí a baixa é manual).
async function obterPix(mensalidade, contexto) {
  const { total } = await valorAtualizado(mensalidade);
  const valido = mensalidade.pixExpiraEm && new Date(mensalidade.pixExpiraEm) > new Date();

  if (mensalidade.pixCopiaCola && valido && Number(mensalidade.pixValor) === total) {
    return mensalidade;
  }

  if (mensalidade.mpPaymentId) {
    mercadoPagoService.cancelarPagamento(mensalidade.mpPaymentId).catch(() => {});
  }

  const dataExpiracao = expiracaoPix(mensalidade);
  const descricao = `Mensalidade ${mensalidade.competencia} - ${contexto.aluno.nome}`;
  const email = contexto.aluno.responsavel?.email || contexto.aluno.email || 'contato@sanryu.com.br';

  const pagamentoMp = await mercadoPagoService
    .criarPagamentoPix({ valor: total, descricao, email, referenciaExterna: `${PREFIXO_REFERENCIA}${mensalidade.id}`, dataExpiracao })
    .catch((err) => {
      logErro('Erro ao criar Pix da mensalidade no Mercado Pago, caindo para QR estático:', err);
      return null;
    });

  if (pagamentoMp) {
    return mensalidade.update({
      mpPaymentId: pagamentoMp.paymentId,
      qrcodePix: pagamentoMp.qrcodeBase64,
      pixCopiaCola: pagamentoMp.pixCopiaCola,
      pixValor: total,
      pixExpiraEm: dataExpiracao,
    });
  }

  const banco = await Banco.findOne({ order: [['id', 'ASC']] });

  if (!banco) {
    logErro('Nenhuma conta Pix cadastrada (tabela banco); Pix da mensalidade não gerado.');
    return mensalidade;
  }

  const pixCopiaCola = pixService.gerarPayload({
    chavePix: banco.chavePix,
    nomeRecebedor: banco.titular,
    cidade: banco.cidade,
    valor: total,
    txid: `${PREFIXO_REFERENCIA}${mensalidade.id}${Date.now()}`.slice(0, 25),
  });

  return mensalidade.update({
    mpPaymentId: null,
    qrcodePix: await pixService.gerarQrCodeBase64(pixCopiaCola),
    pixCopiaCola,
    pixValor: total,
    pixExpiraEm: dataExpiracao,
  });
}

// ---- Baixa ----

async function darBaixa(mensalidade, { valorPago, formaPagamento, pagoEm, observacoes }) {
  return mensalidade.update({
    status: 'pago',
    valorPago,
    formaPagamento,
    pagoEm: pagoEm || new Date(),
    ...(observacoes !== undefined ? { observacoes } : {}),
  });
}

// Confere um pagamento direto na API do Mercado Pago e dá baixa no que ele pagou — usado pelo
// webhook e pela verificação periódica. Nunca confia no corpo da notificação: só no que a API diz.
// Também serve às inscrições de evento (que antes só tinham verificação manual).
async function processarPagamentoMercadoPago(paymentId) {
  const pagamento = await mercadoPagoService.consultarPagamento(paymentId);
  const referencia = pagamento.referenciaExterna || '';

  // Pedido da loja da área do aluno (require tardio: lojaService usa este módulo).
  if (referencia.startsWith('PED')) {
    if (pagamento.statusPagamento !== 'pago') return { tipo: 'pedido', baixada: false };
    const { confirmarPagamento } = require('./lojaService');
    const baixada = await confirmarPagamento(Number(referencia.slice(3)), { valor: pagamento.valor, aprovadoEm: pagamento.aprovadoEm });
    return { tipo: 'pedido', id: Number(referencia.slice(3)), baixada };
  }

  if (referencia.startsWith(PREFIXO_REFERENCIA)) {
    const mensalidade = await Mensalidade.findByPk(Number(referencia.slice(PREFIXO_REFERENCIA.length)));

    if (mensalidade && mensalidade.status === 'pendente' && pagamento.statusPagamento === 'pago') {
      await darBaixa(mensalidade, {
        valorPago: pagamento.valor,
        formaPagamento: 'pix',
        pagoEm: pagamento.aprovadoEm ? new Date(pagamento.aprovadoEm) : new Date(),
      });
      return { tipo: 'mensalidade', id: mensalidade.id, baixada: true };
    }

    return { tipo: 'mensalidade', id: mensalidade?.id, baixada: false };
  }

  const inscricao = await EventoAluno.findOne({ where: { mpPaymentId: String(paymentId) } });

  // "cancelado" é decisão manual do admin e não pode ser sobrescrito (ver eventoController.verificarPagamento).
  if (inscricao && inscricao.statusPagamento !== 'cancelado' && inscricao.statusPagamento !== pagamento.statusPagamento) {
    await inscricao.update({ statusPagamento: pagamento.statusPagamento });
    return { tipo: 'inscricao', id: inscricao.id, baixada: pagamento.statusPagamento === 'pago' };
  }

  return { tipo: 'desconhecido', baixada: false };
}

// ---- Avisos ----

async function urlPagamento(mensalidade) {
  const base = (await configService.obterValor('SITE_URL')) || '';
  return `${base.replace(/\/+$/, '')}/mensalidades/${mensalidade.token}`;
}

async function carregarComAluno(where) {
  return Mensalidade.findAll({
    where,
    include: {
      model: Aluno,
      as: 'aluno',
      attributes: ['id', 'nome', 'email', 'telefone'],
      include: { model: Responsavel, as: 'responsavel', attributes: ['id', 'nome', 'email', 'telefone'] },
    },
  });
}

async function enviarAviso(mensalidade, tipo) {
  const destinatario = mensalidade.aluno.responsavel?.email || mensalidade.aluno.email;
  if (!destinatario) return false;

  const atualizado = await valorAtualizado(mensalidade);
  const enviado = await emailService.enviarCobrancaMensalidade({
    tipo,
    destinatario,
    nome: mensalidade.aluno.responsavel?.nome || mensalidade.aluno.nome,
    aluno: mensalidade.aluno.nome,
    competencia: mensalidade.competencia,
    vencimento: formatarData(mensalidade.vencimento),
    valor: formatarMoeda(atualizado.total),
    link: await urlPagamento(mensalidade),
  });

  return enviado;
}

// Três avisos por cobrança: ao gerar (se ainda não venceu), no dia do vencimento e N dias depois.
// Cada um sai uma vez só (marcado na mensalidade).
async function enviarAvisosPendentes(dataReferencia = hoje()) {
  const pendentes = await carregarComAluno({ status: 'pendente' });
  let enviados = 0;

  for (const mensalidade of pendentes) {
    let tipo = null;
    let campo = null;

    if (mensalidade.vencimento <= somarDias(dataReferencia, -DIAS_AVISO_ATRASO) && !mensalidade.emailAtrasoEm) {
      [tipo, campo] = ['atraso', 'emailAtrasoEm'];
    } else if (mensalidade.vencimento === dataReferencia && !mensalidade.emailVencimentoEm) {
      [tipo, campo] = ['vencimento', 'emailVencimentoEm'];
    } else if (mensalidade.vencimento > dataReferencia && !mensalidade.emailCobrancaEm) {
      [tipo, campo] = ['cobranca', 'emailCobrancaEm'];
    }

    if (tipo && (await enviarAviso(mensalidade, tipo))) {
      await mensalidade.update({ [campo]: new Date() });
      enviados += 1;
    }
  }

  return enviados;
}

// Reserva pro webhook: confere no MP os Pix ainda válidos das mensalidades pendentes.
async function verificarPixPendentes() {
  const pendentes = await Mensalidade.findAll({
    where: { status: 'pendente', mpPaymentId: { [Op.ne]: null }, pixExpiraEm: { [Op.gt]: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  let baixadas = 0;

  for (const mensalidade of pendentes) {
    try {
      const resultado = await processarPagamentoMercadoPago(mensalidade.mpPaymentId);
      if (resultado.baixada) baixadas += 1;
    } catch (err) {
      logErro(`Erro ao verificar Pix da mensalidade ${mensalidade.id}:`, err);
    }
  }

  return baixadas;
}

// Rotina completa (roda de hora em hora, ver server.js): gera o que falta, confere Pix e manda avisos.
let rodando = false;

async function rotinaCobranca() {
  if (rodando) return null;
  rodando = true;

  try {
    const geradas = await gerarMensalidades();
    const baixadas = await verificarPixPendentes();
    const avisos = await enviarAvisosPendentes();
    return { geradas: geradas.length, baixadas, avisos };
  } catch (err) {
    logErro('Erro na rotina de cobrança de mensalidades:', err);
    return null;
  } finally {
    rodando = false;
  }
}

module.exports = {
  hoje,
  valorAtualizado,
  gerarMensalidades,
  obterPix,
  darBaixa,
  processarPagamentoMercadoPago,
  enviarAviso,
  enviarAvisosPendentes,
  rotinaCobranca,
  urlPagamento,
  carregarComAluno,
  primeiroVencimento,
  somarMeses,
};
