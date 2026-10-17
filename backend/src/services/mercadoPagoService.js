const axios = require('axios');
const crypto = require('crypto');
const configService = require('./configService');

const MP_API_URL = 'https://api.mercadopago.com/v1/payments';

async function obterAccessToken() {
  return configService.obterValor('MP_ACCESS_TOKEN');
}

// URL que o Mercado Pago chama quando o status de um pagamento muda (ver webhookController). Só
// existe se a URL pública da API estiver em Configurações — sem ela, a baixa fica pela verificação
// periódica/manual.
async function urlNotificacao() {
  const base = (await configService.obterValor('API_PUBLICA_URL')) || '';
  return base ? `${base.replace(/\/+$/, '')}/api/webhooks/mercadopago` : null;
}

// Cria uma cobrança Pix dinâmica no Mercado Pago. Retorna null se o Access Token ainda não
// foi configurado em /admin/configuracoes, permitindo que o chamador caia no QR estático.
// dataExpiracao (Date, opcional): até quando o Pix pode ser pago — sem ela, o MP usa o padrão (24h).
async function criarPagamentoPix({ valor, descricao, email, referenciaExterna, dataExpiracao }) {
  const accessToken = await obterAccessToken();

  if (!accessToken) {
    return null;
  }

  const notificacao = await urlNotificacao();
  const resposta = await axios.post(
    MP_API_URL,
    {
      transaction_amount: Number(valor),
      description: descricao,
      payment_method_id: 'pix',
      payer: { email },
      external_reference: referenciaExterna,
      ...(dataExpiracao ? { date_of_expiration: dataExpiracao.toISOString().replace('Z', '+00:00') } : {}),
      ...(notificacao ? { notification_url: notificacao } : {}),
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Idempotency-Key': crypto.randomBytes(16).toString('hex'),
      },
      timeout: 15000,
    }
  );

  const dados = resposta.data;
  const transacao = dados.point_of_interaction?.transaction_data;

  return {
    paymentId: String(dados.id),
    status: dados.status,
    qrcodeBase64: transacao?.qr_code_base64 ? `data:image/png;base64,${transacao.qr_code_base64}` : null,
    pixCopiaCola: transacao?.qr_code || null,
  };
}

// status possíveis: pending, approved, authorized, in_process, in_mediation, rejected,
// cancelled, refunded, charged_back.
function mapearStatusPagamento(statusMp) {
  if (statusMp === 'approved') return 'pago';
  if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(statusMp)) return 'expirado';
  return 'pendente';
}

async function consultarPagamento(paymentId) {
  const accessToken = await obterAccessToken();

  if (!accessToken) {
    const erroConfig = new Error('Access Token do Mercado Pago não configurado em Configurações.');
    erroConfig.interno = true;
    throw erroConfig;
  }

  const resposta = await axios.get(`${MP_API_URL}/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 15000,
  });

  return {
    statusMp: resposta.data.status,
    statusPagamento: mapearStatusPagamento(resposta.data.status),
    referenciaExterna: resposta.data.external_reference || null,
    valor: resposta.data.transaction_amount,
    aprovadoEm: resposta.data.date_approved || null,
  };
}

// Cancela a cobrança Pix no Mercado Pago. A própria API do MP só aceita esse cancelamento enquanto
// o pagamento ainda está "pending" lá — quem chama (eventoController) já garante isso antes de
// chegar aqui, checando o statusPagamento local.
async function cancelarPagamento(paymentId) {
  const accessToken = await obterAccessToken();

  if (!accessToken) {
    const erroConfig = new Error('Access Token do Mercado Pago não configurado em Configurações.');
    erroConfig.interno = true;
    throw erroConfig;
  }

  const resposta = await axios.put(
    `${MP_API_URL}/${paymentId}`,
    { status: 'cancelled' },
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 15000,
    }
  );

  return { statusMp: resposta.data.status };
}

module.exports = { criarPagamentoPix, consultarPagamento, cancelarPagamento, mapearStatusPagamento };
