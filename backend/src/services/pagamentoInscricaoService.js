const { Banco } = require('../models');
const pixService = require('./pixService');
const mercadoPagoService = require('./mercadoPagoService');
const { logErro } = require('../utils/logger');

const VALIDADE_QR_CODE_MS = 24 * 60 * 60 * 1000;

// Usado tanto pra bloquear regeneração de um QR ainda válido (tela pública) quanto pra decidir se
// vale a pena gerar um Pix novo antes de reenviar um lembrete de pagamento (ver eventoController).
function qrExpirado(eventoAluno) {
  return Date.now() - new Date(eventoAluno.createdAt).getTime() >= VALIDADE_QR_CODE_MS;
}

// Gera um novo pagamento Pix (Mercado Pago dinâmico, com fallback pro QR estático de /admin/bancos)
// — usado numa inscrição nova, ao regenerar o QR code de uma pendência expirada, e ao renovar
// automaticamente antes de reenviar um lembrete de pagamento pendente.
async function gerarPagamentoPix({ valor, evento, email }) {
  let qrcodePix = null;
  let pixCopiaCola = null;
  let mpPaymentId = null;

  const pagamentoMp = await mercadoPagoService
    .criarPagamentoPix({
      valor,
      descricao: `Inscrição - ${evento.nome}`,
      email,
      referenciaExterna: `EVT${evento.id}-${Date.now()}`,
    })
    .catch((err) => {
      logErro('Erro ao criar pagamento Pix via Mercado Pago, caindo para QR estático:', err);
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
        valor,
        txid: `EVT${evento.id}${Date.now()}`,
      });
      qrcodePix = await pixService.gerarQrCodeBase64(pixCopiaCola);
    } else {
      logErro('Nenhuma configuração de conta Pix cadastrada (tabela banco); QR code não gerado.');
    }
  }

  return { qrcodePix, pixCopiaCola, mpPaymentId };
}

module.exports = { VALIDADE_QR_CODE_MS, qrExpirado, gerarPagamentoPix };
