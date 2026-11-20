const crypto = require('crypto');
const { Op } = require('sequelize');
const { Evento, EventoAluno, Instrutor, TipoEvento } = require('../models');
const emailService = require('./emailService');
const configService = require('./configService');

// Certificado de participação dos eventos do tipo "treinamento". O texto é editável por evento, com
// marcadores; vazio usa o padrão abaixo.
const MARCADORES = ['nome', 'evento', 'data', 'cargaHoraria', 'instrutor', 'local'];

function dataPorExtenso(data) {
  return new Date(data).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
}

// Data, local e carga horária já aparecem na faixa lateral do certificado; o texto fica pra
// mensagem do evento (o que foi treinado, com quem...).
function textoPadrao() {
  return 'Obrigado pela presença e dedicação no tatame. Seguimos juntos no caminho do Método Morganti Ju-Jitsu.';
}

function montarTexto(evento, inscricao) {
  const valores = {
    nome: inscricao.nome || '',
    evento: evento.nome || '',
    data: dataPorExtenso(evento.data),
    cargaHoraria: evento.cargaHoraria || '',
    instrutor: evento.instrutor?.nome || '',
    local: evento.local || '',
  };
  const modelo = (evento.textoCertificado || '').trim() || textoPadrao();
  return modelo.replace(/\{\{\s*(\w+)\s*\}\}/g, (marcador, chave) => (MARCADORES.includes(chave) ? valores[chave] : marcador));
}

async function linkDoCertificado(token) {
  const base = ((await configService.obterValor('SITE_URL')) || '').replace(/\/+$/, '');
  return `${base}/certificados/${token}`;
}

// Envia o certificado por e-mail a todos os inscritos com a inscrição paga (gratuita conta como paga).
// somenteNaoEnviados: true = só quem ainda não recebeu (pra mandar aos que se inscreveram depois).
async function enviar(eventoId, { somenteNaoEnviados = true } = {}) {
  const evento = await Evento.findByPk(eventoId, { include: [{ model: TipoEvento, as: 'tipoEvento' }] });
  if (!evento) throw new Error('Evento não encontrado.');
  if (!evento.tipoEvento?.treinamento) throw new Error('Certificado é só para eventos do tipo treinamento.');

  const inscricoes = await EventoAluno.findAll({ where: { eventoId: evento.id } });
  const pagas = inscricoes.filter((inscricao) => inscricao.statusPagamento === 'pago');
  const alvo = somenteNaoEnviados ? pagas.filter((inscricao) => !inscricao.certificadoEnviadoEm) : pagas;

  let enviados = 0;
  const falhas = [];
  for (const inscricao of alvo) {
    if (!inscricao.tokenCertificado) await inscricao.update({ tokenCertificado: crypto.randomBytes(16).toString('hex') });
    const ok = await emailService.enviarCertificado({
      destinatario: inscricao.email,
      nome: inscricao.nome,
      evento: evento.nome,
      link: await linkDoCertificado(inscricao.tokenCertificado),
    });
    if (ok) {
      await inscricao.update({ certificadoEnviadoEm: new Date() });
      enviados += 1;
    } else {
      falhas.push(inscricao.email);
    }
  }

  return { enviados, falhas, semPagamento: inscricoes.length - pagas.length };
}

// Página pública do certificado (o link do e-mail). Só sai pra inscrição paga.
async function buscarPorToken(token) {
  if (!/^[a-f0-9]{32}$/.test(token || '')) return null;
  const inscricao = await EventoAluno.findOne({ where: { tokenCertificado: token, statusPagamento: { [Op.eq]: 'pago' } } });
  if (!inscricao) return null;

  const evento = await Evento.findByPk(inscricao.eventoId, { include: [{ model: Instrutor, as: 'instrutor', attributes: ['nome'] }] });
  return {
    nome: inscricao.nome,
    evento: evento.nome,
    data: evento.data,
    local: evento.local,
    cargaHoraria: evento.cargaHoraria,
    instrutor: evento.instrutor?.nome || null,
    texto: montarTexto(evento, inscricao),
    assinatura: {
      nome: evento.assinaturaNome || evento.instrutor?.nome || 'San·Ryu Dojo',
      cargo: evento.assinaturaCargo || 'Morganti Ju-Jitsu',
      imagem: evento.assinaturaImagem || null,
    },
  };
}

module.exports = { enviar, buscarPorToken, montarTexto, textoPadrao, MARCADORES };
