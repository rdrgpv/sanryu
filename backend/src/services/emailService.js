const nodemailer = require('nodemailer');
const configService = require('./configService');
const { logErro } = require('../utils/logger');

// Credenciais SMTP ficam em Configurações (sistema SAN), mesmo padrão do Gatame/Mercado Pago —
// podem ser trocadas sem reiniciar o servidor.
async function obterTransportador() {
  const [host, porta, usuario, senha] = await Promise.all([
    configService.obterValor('SMTP_HOST'),
    configService.obterValor('SMTP_PORT'),
    configService.obterValor('SMTP_USER'),
    configService.obterValor('SMTP_SENHA'),
  ]);

  if (!host || !porta || !usuario || !senha) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(porta),
    secure: Number(porta) === 465,
    auth: { user: usuario, pass: senha },
  });
}

function base64DoDataUri(dataUri) {
  const virgula = dataUri.indexOf(',');
  return virgula === -1 ? dataUri : dataUri.slice(virgula + 1);
}

// Dispara o e-mail de confirmação com os dados da inscrição e, se houver, o QR code Pix (embutido
// como imagem inline) e o código copia e cola. Nunca lança — falha de e-mail não pode derrubar a
// inscrição, que já foi concluída no banco antes desta chamada.
async function enviarConfirmacaoInscricao({ evento, eventoAluno }) {
  try {
    const transportador = await obterTransportador();

    if (!transportador) {
      logErro('SMTP não configurado (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_SENHA) em Configurações; e-mail de confirmação não enviado.');
      return;
    }

    const remetente = (await configService.obterValor('SMTP_FROM')) || (await configService.obterValor('SMTP_USER'));
    const copiaPara = await configService.obterValor('SMTP_BCC');

    const anexos = [];
    let imagemQrHtml = '';

    if (eventoAluno.qrcodePix) {
      anexos.push({
        filename: 'qrcode-pix.png',
        content: base64DoDataUri(eventoAluno.qrcodePix),
        encoding: 'base64',
        cid: 'qrcodepix',
      });
      imagemQrHtml = '<p><img src="cid:qrcodepix" alt="QR code Pix" style="max-width:260px;" /></p>';
    }

    const linhaValor =
      eventoAluno.valorCobrado != null
        ? `<p><strong>Valor:</strong> R$ ${Number(eventoAluno.valorCobrado).toFixed(2)}</p>`
        : eventoAluno.statusPagamento === 'pago'
          ? '<p>Inscrição gratuita, sem pagamento necessário.</p>'
          : '';

    const linhaPix = eventoAluno.pixCopiaCola
      ? `<p><strong>Pix Copia e Cola:</strong></p>
         <p style="word-break:break-all;font-family:monospace;background:#f5f5f5;padding:8px;border-radius:4px;">${eventoAluno.pixCopiaCola}</p>
         <p><em>Este QR code/código Pix tem validade de 24 horas.</em></p>`
      : '';

    const html = `
      <h2>Inscrição confirmada — ${evento.nome}</h2>
      <p>Olá, ${eventoAluno.nome}!</p>
      <p>Sua inscrição foi registrada com os seguintes dados:</p>
      <ul>
        <li><strong>Nome:</strong> ${eventoAluno.nome}</li>
        <li><strong>Email:</strong> ${eventoAluno.email}</li>
        ${eventoAluno.telefone ? `<li><strong>Telefone:</strong> ${eventoAluno.telefone}</li>` : ''}
        ${eventoAluno.faixaAtual ? `<li><strong>Faixa atual:</strong> ${eventoAluno.faixaAtual}</li>` : ''}
        ${eventoAluno.faixa ? `<li><strong>Faixa que vai:</strong> ${eventoAluno.faixa}</li>` : ''}
        ${eventoAluno.responsavel ? `<li><strong>Responsável:</strong> ${eventoAluno.responsavel}</li>` : ''}
      </ul>
      ${linhaValor}
      ${imagemQrHtml}
      ${linhaPix}
      <p>Qualquer dúvida, é só responder este e-mail.</p>
    `;

    const info = await transportador.sendMail({
      from: remetente,
      to: eventoAluno.email,
      bcc: copiaPara || undefined,
      subject: `Inscrição confirmada — ${evento.nome}`,
      html,
      attachments: anexos,
    });

    console.log('E-mail de confirmação de inscrição enviado:', info.messageId);
  } catch (err) {
    logErro('Erro ao enviar e-mail de confirmação de inscrição:', err);
  }
}

module.exports = { enviarConfirmacaoInscricao };
