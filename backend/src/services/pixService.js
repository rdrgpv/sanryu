const QRCode = require('qrcode');

// Monta um campo no formato TLV (ID + tamanho em 2 dígitos + valor) do padrão BR Code/EMV usado pelo Pix.
function campo(id, valor) {
  const tamanho = String(valor.length).padStart(2, '0');
  return `${id}${tamanho}${valor}`;
}

function crc16(payload) {
  let crc = 0xffff;
  const polinomio = 0x1021;

  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;

    for (let j = 0; j < 8; j += 1) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ polinomio) & 0xffff : (crc << 1) & 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

const DIACRITICOS = new RegExp('[̀-ͯ]', 'g');

function sanitizar(texto, tamanho) {
  return (texto || '')
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .slice(0, tamanho)
    .toUpperCase();
}

function gerarPayload({ chavePix, nomeRecebedor, cidade, valor, txid }) {
  const merchantAccountInfo = campo('26', campo('00', 'br.gov.bcb.pix') + campo('01', chavePix));
  const valorFormatado = valor ? Number(valor).toFixed(2) : null;
  const txidSanitizado = sanitizar(txid, 25) || '***';

  let payload =
    campo('00', '01') +
    merchantAccountInfo +
    campo('52', '0000') +
    campo('53', '986') +
    (valorFormatado ? campo('54', valorFormatado) : '') +
    campo('58', 'BR') +
    campo('59', sanitizar(nomeRecebedor, 25) || 'RECEBEDOR') +
    campo('60', sanitizar(cidade, 15) || 'SAO PAULO') +
    campo('62', campo('05', txidSanitizado)) +
    '6304';

  return payload + crc16(payload);
}

async function gerarQrCodeBase64(payload) {
  return QRCode.toDataURL(payload, { margin: 1, width: 320 });
}

module.exports = { gerarPayload, gerarQrCodeBase64 };
