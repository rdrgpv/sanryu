const { processarPagamentoMercadoPago } = require('../services/mensalidadeService');
const { logErro } = require('../utils/logger');

// Notificação do Mercado Pago (configurada via notification_url em cada Pix). O corpo da notificação
// NÃO é confiável — qualquer um pode chamar esta URL. Por isso só usamos o id do pagamento e
// consultamos o status de verdade na API do MP (com o nosso Access Token) antes de dar baixa.
//
// Formatos que o MP manda: { type: 'payment', data: { id } } no corpo, ou ?type=payment&data.id=...
// (e o formato antigo ?topic=payment&id=...).
async function mercadoPago(req, res) {
  const tipo = req.body?.type || req.query.type || req.query.topic;
  const paymentId = req.body?.data?.id || req.query['data.id'] || req.query.id;

  if (tipo !== 'payment' || !paymentId) {
    return res.sendStatus(200);
  }

  try {
    await processarPagamentoMercadoPago(paymentId);
    res.sendStatus(200);
  } catch (err) {
    // 500 faz o Mercado Pago tentar de novo mais tarde (ex.: API do MP fora do ar agora).
    logErro(`Erro ao processar webhook do Mercado Pago (pagamento ${paymentId}):`, err);
    res.sendStatus(500);
  }
}

module.exports = { mercadoPago };
