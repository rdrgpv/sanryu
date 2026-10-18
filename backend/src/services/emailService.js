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
        ${eventoAluno.tamanhoFaixa ? `<li><strong>Tamanho da faixa:</strong> ${eventoAluno.tamanhoFaixa}</li>` : ''}
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

// Lembrete pra quem já está inscrito mas ainda não pagou — reenvia o QR code/Pix copia-cola que já
// está gravado na inscrição (não gera um novo; se estiver vencido, a pessoa pode gerar um novo pela
// própria página pública de inscrição). Mesmo padrão da confirmação: nunca lança.
async function enviarLembretePagamentoPendente({ evento, eventoAluno }) {
  try {
    const transportador = await obterTransportador();

    if (!transportador) {
      logErro('SMTP não configurado (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_SENHA) em Configurações; lembrete de pagamento não enviado.');
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

    const linhaPix = eventoAluno.pixCopiaCola
      ? `<p><strong>Pix Copia e Cola:</strong></p>
         <p style="word-break:break-all;font-family:monospace;background:#f5f5f5;padding:8px;border-radius:4px;">${eventoAluno.pixCopiaCola}</p>
         <p><em>Se o QR code/código Pix estiver vencido (validade de 24 horas), acesse novamente o link de inscrição do evento e clique em "Gerar novo QR code".</em></p>`
      : '<p>Acesse novamente o link de inscrição do evento pra gerar seu QR code de pagamento.</p>';

    const html = `
      <h2>Lembrete: pagamento pendente — ${evento.nome}</h2>
      <p>Olá, ${eventoAluno.nome}!</p>
      <p>Notamos que sua inscrição no evento <strong>${evento.nome}</strong> ainda está com o pagamento pendente.</p>
      ${eventoAluno.valorCobrado != null ? `<p><strong>Valor:</strong> R$ ${Number(eventoAluno.valorCobrado).toFixed(2)}</p>` : ''}
      ${imagemQrHtml}
      ${linhaPix}
      <p>Qualquer dúvida, é só responder este e-mail.</p>
    `;

    const info = await transportador.sendMail({
      from: remetente,
      to: eventoAluno.email,
      bcc: copiaPara || undefined,
      subject: `Lembrete: pagamento pendente — ${evento.nome}`,
      html,
      attachments: anexos,
    });

    console.log('E-mail de lembrete de pagamento pendente enviado:', info.messageId);
  } catch (err) {
    logErro('Erro ao enviar e-mail de lembrete de pagamento pendente:', err);
  }
}

const TEXTOS_COBRANCA = {
  cobranca: {
    assunto: (dados) => `Mensalidade ${dados.competencia} — ${dados.aluno}`,
    abertura: (dados) => `A mensalidade de <strong>${dados.aluno}</strong> referente a ${dados.competencia} já está disponível.`,
  },
  vencimento: {
    assunto: (dados) => `Vence hoje: mensalidade ${dados.competencia} — ${dados.aluno}`,
    abertura: (dados) => `Lembrete: a mensalidade de <strong>${dados.aluno}</strong> (${dados.competencia}) vence hoje.`,
  },
  atraso: {
    assunto: (dados) => `Mensalidade em atraso — ${dados.aluno}`,
    abertura: (dados) =>
      `A mensalidade de <strong>${dados.aluno}</strong> (${dados.competencia}) venceu em ${dados.vencimento} e ainda consta em aberto. Se já pagou, desconsidere este aviso.`,
  },
};

// Cobrança de mensalidade (gerada / vence hoje / em atraso). Manda só o link: o Pix é gerado quando
// a pessoa abre, já com o valor do dia (com multa/juros se houver) — um QR no e-mail ficaria velho.
// Devolve true/false (quem chama marca o aviso como enviado só se saiu); nunca lança.
async function enviarCobrancaMensalidade({ tipo, destinatario, nome, aluno, competencia, vencimento, valor, link }) {
  try {
    const transportador = await obterTransportador();

    if (!transportador) {
      logErro('SMTP não configurado em Configurações; e-mail de mensalidade não enviado.');
      return false;
    }

    const remetente = (await configService.obterValor('SMTP_FROM')) || (await configService.obterValor('SMTP_USER'));
    const copiaPara = await configService.obterValor('SMTP_BCC');
    const textos = TEXTOS_COBRANCA[tipo] || TEXTOS_COBRANCA.cobranca;
    const dados = { aluno, competencia, vencimento };

    const html = `
      <p>Olá, ${nome}!</p>
      <p>${textos.abertura(dados)}</p>
      <ul>
        <li><strong>Vencimento:</strong> ${vencimento}</li>
        <li><strong>Valor:</strong> ${valor}</li>
      </ul>
      <p><a href="${link}" style="display:inline-block;background:#B23A2F;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none;">Pagar com Pix</a></p>
      <p style="font-size:12px;color:#666;">Ou copie o link: ${link}</p>
      <p>Qualquer dúvida, é só responder este e-mail.</p>
    `;

    const info = await transportador.sendMail({
      from: remetente,
      to: destinatario,
      bcc: copiaPara || undefined,
      subject: textos.assunto(dados),
      html,
    });

    console.log(`E-mail de mensalidade (${tipo}) enviado:`, info.messageId);
    return true;
  } catch (err) {
    logErro('Erro ao enviar e-mail de mensalidade:', err);
    return false;
  }
}

// Código de acesso à área do aluno/responsável. Devolve true/false; nunca lança.
async function enviarCodigoAcesso({ destinatario, codigo, minutos }) {
  try {
    const transportador = await obterTransportador();

    if (!transportador) {
      logErro('SMTP não configurado em Configurações; código de acesso à área do aluno não enviado.');
      return false;
    }

    const remetente = (await configService.obterValor('SMTP_FROM')) || (await configService.obterValor('SMTP_USER'));

    await transportador.sendMail({
      from: remetente,
      to: destinatario,
      subject: `Seu código de acesso: ${codigo}`,
      html: `
        <p>Olá!</p>
        <p>Use o código abaixo para entrar na área do aluno do San·Ryu Dojo:</p>
        <p style="font-size:28px;font-weight:bold;letter-spacing:6px;font-family:monospace;">${codigo}</p>
        <p>Ele vale por ${minutos} minutos. Se não foi você que pediu, pode ignorar este e-mail.</p>
      `,
    });

    return true;
  } catch (err) {
    logErro('Erro ao enviar código de acesso:', err);
    return false;
  }
}

// Aula experimental: confirmação ao agendar e lembrete na véspera. Devolve true/false; nunca lança.
async function enviarAulaExperimental({ tipo, destinatario, nome, aluno, turma, data, horario, endereco }) {
  try {
    const transportador = await obterTransportador();

    if (!transportador) {
      logErro('SMTP não configurado em Configurações; e-mail de aula experimental não enviado.');
      return false;
    }

    const remetente = (await configService.obterValor('SMTP_FROM')) || (await configService.obterValor('SMTP_USER'));
    const copiaPara = await configService.obterValor('SMTP_BCC');
    const lembrete = tipo === 'lembrete';

    await transportador.sendMail({
      from: remetente,
      to: destinatario,
      bcc: copiaPara || undefined,
      subject: lembrete ? `Amanhã: aula experimental — ${turma}` : `Aula experimental agendada — ${turma}`,
      html: `
        <p>Olá, ${nome}!</p>
        <p>${lembrete ? 'Passando para lembrar da aula experimental de amanhã' : 'Sua aula experimental está agendada'}${aluno !== nome ? ` para <strong>${aluno}</strong>` : ''}:</p>
        <ul>
          <li><strong>Turma:</strong> ${turma}</li>
          <li><strong>Quando:</strong> ${data}${horario ? `, ${horario}` : ''}</li>
          ${endereco ? `<li><strong>Onde:</strong> ${endereco}</li>` : ''}
        </ul>
        <p>Venha com roupa confortável e chegue uns 10 minutos antes.</p>
        <p>Se não puder vir, responda este e-mail para remarcar.</p>
      `,
    });

    return true;
  } catch (err) {
    logErro('Erro ao enviar e-mail de aula experimental:', err);
    return false;
  }
}

function escaparHtml(texto) {
  return String(texto).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Comunicado em massa (tela Avisos). O texto vem digitado no admin: é escapado (nada de HTML/script
// vindo dele) e as quebras de linha viram <br>. Devolve true/false; nunca lança.
async function enviarAviso({ destinatario, nome, titulo, mensagem }) {
  try {
    const transportador = await obterTransportador();

    if (!transportador) {
      logErro('SMTP não configurado em Configurações; aviso não enviado.');
      return false;
    }

    const remetente = (await configService.obterValor('SMTP_FROM')) || (await configService.obterValor('SMTP_USER'));

    await transportador.sendMail({
      from: remetente,
      to: destinatario,
      subject: titulo,
      text: `Olá, ${nome}!\n\n${mensagem}\n\nSan·Ryu Dojo`,
      html: `
        <p>Olá, ${escaparHtml(nome)}!</p>
        <p>${escaparHtml(mensagem).replace(/\r?\n/g, '<br>')}</p>
        <p>San·Ryu Dojo</p>
      `,
    });

    return true;
  } catch (err) {
    logErro('Erro ao enviar aviso por e-mail:', err);
    return false;
  }
}

module.exports = { enviarConfirmacaoInscricao, enviarLembretePagamentoPendente, enviarCobrancaMensalidade, enviarCodigoAcesso, enviarAulaExperimental, enviarAviso };
