const { Op } = require('sequelize');
const { Aviso, Aluno, Responsavel, Matricula, Mensalidade, EventoAluno, Unidade, Turma, Evento } = require('../models');
const emailService = require('./emailService');
const { hoje } = require('./mensalidadeService');
const { logErro } = require('../utils/logger');

const INCLUDE_RESPONSAVEL = { model: Responsavel, as: 'responsavel', attributes: ['nome', 'email'] };

// Um destinatário por e-mail: irmãos com o mesmo responsável recebem uma vez só. Criança fala com
// o responsável; adulto com o próprio aluno. Quem não tem e-mail fica de fora (e é contado à parte).
function porEmail(alunos) {
  const mapa = new Map();
  let semEmail = 0;

  for (const aluno of alunos) {
    const email = (aluno.responsavel?.email || aluno.email || '').trim().toLowerCase();
    if (!email) {
      semEmail += 1;
      continue;
    }
    const existente = mapa.get(email);
    if (existente) existente.alunos.push(aluno.nome);
    else mapa.set(email, { email, nome: aluno.responsavel?.nome || aluno.nome, alunos: [aluno.nome] });
  }

  return { destinatarios: [...mapa.values()], semEmail };
}

const ALUNO_ATIVO_DO_DOJO = { situacao: 'ativo', vinculo: 'academia' };

async function alunosDoPublico(publico, alvoId) {
  const atributos = ['id', 'nome', 'email'];

  if (publico === 'todos') {
    return Aluno.findAll({ where: ALUNO_ATIVO_DO_DOJO, attributes: atributos, include: INCLUDE_RESPONSAVEL });
  }
  if (publico === 'unidade') {
    return Aluno.findAll({ where: { ...ALUNO_ATIVO_DO_DOJO, unidadeId: alvoId }, attributes: atributos, include: INCLUDE_RESPONSAVEL });
  }
  if (publico === 'turma') {
    const matriculas = await Matricula.findAll({ where: { turmaId: alvoId, status: 'ativa' }, attributes: ['alunoId'] });
    return Aluno.findAll({ where: { ...ALUNO_ATIVO_DO_DOJO, id: matriculas.map((matricula) => matricula.alunoId) }, attributes: atributos, include: INCLUDE_RESPONSAVEL });
  }
  if (publico === 'inadimplentes') {
    const vencidas = await Mensalidade.findAll({ where: { status: 'pendente', vencimento: { [Op.lt]: hoje() } }, attributes: ['alunoId'] });
    return Aluno.findAll({ where: { id: [...new Set(vencidas.map((mensalidade) => mensalidade.alunoId))] }, attributes: atributos, include: INCLUDE_RESPONSAVEL });
  }
  return [];
}

async function destinatariosDo(publico, alvoId) {
  if (publico === 'evento') {
    // Inscritos do evento (inclui alunos Morganti externos): o e-mail é o da inscrição.
    const inscricoes = await EventoAluno.findAll({ where: { eventoId: alvoId, statusPagamento: { [Op.ne]: 'cancelado' } }, attributes: ['email', 'nome'] });
    return porEmail(inscricoes.map((inscricao) => ({ nome: inscricao.nome || inscricao.email, email: inscricao.email })));
  }
  return porEmail(await alunosDoPublico(publico, alvoId));
}

async function descreverPublico(publico, alvoId) {
  if (publico === 'todos') return 'Todos os alunos ativos';
  if (publico === 'inadimplentes') return 'Com mensalidade em atraso';
  if (publico === 'unidade') return `Unidade ${(await Unidade.findByPk(alvoId))?.nome || alvoId}`;
  if (publico === 'turma') return `Turma ${(await Turma.findByPk(alvoId))?.nome || alvoId}`;
  if (publico === 'evento') return `Inscritos: ${(await Evento.findByPk(alvoId))?.nome || alvoId}`;
  return publico;
}

// Envia um por um em segundo plano, atualizando os contadores (a tela acompanha). Falha de um
// destinatário não para os outros.
async function enviar(aviso) {
  const { destinatarios } = await destinatariosDo(aviso.publico, aviso.alvoId);
  await aviso.update({ status: 'enviando', totalDestinatarios: destinatarios.length, enviados: 0, falhas: 0 });

  let enviados = 0;
  let falhas = 0;

  for (const [indice, destinatario] of destinatarios.entries()) {
    try {
      const ok = await emailService.enviarAviso({ destinatario: destinatario.email, nome: destinatario.nome, titulo: aviso.titulo, mensagem: aviso.mensagem });
      if (ok) enviados += 1;
      else falhas += 1;
    } catch (err) {
      falhas += 1;
      logErro(`Erro ao enviar aviso ${aviso.id} para ${destinatario.email}:`, err);
    }
    if ((indice + 1) % 10 === 0) await aviso.update({ enviados, falhas });
  }

  await aviso.update({ status: 'concluido', enviados, falhas });
}

// Avisos que aparecem na área do aluno pra este conjunto de alunos (últimos 90 dias): os gerais e
// os da unidade/turma de algum deles.
async function avisosDoPortal(alunoIds) {
  if (alunoIds.length === 0) return [];
  const desde = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const [alunos, matriculas] = await Promise.all([
    Aluno.findAll({ where: { id: alunoIds }, attributes: ['unidadeId'] }),
    Matricula.findAll({ where: { alunoId: alunoIds, status: 'ativa' }, attributes: ['turmaId'] }),
  ]);
  const unidades = [...new Set(alunos.map((aluno) => aluno.unidadeId).filter(Boolean))];
  const turmas = [...new Set(matriculas.map((matricula) => matricula.turmaId))];

  return Aviso.findAll({
    where: {
      mostrarNoPortal: true,
      createdAt: { [Op.gte]: desde },
      [Op.or]: [
        { publico: 'todos' },
        ...(unidades.length ? [{ publico: 'unidade', alvoId: unidades }] : []),
        ...(turmas.length ? [{ publico: 'turma', alvoId: turmas }] : []),
      ],
    },
    attributes: ['id', 'titulo', 'mensagem', 'createdAt'],
    order: [['createdAt', 'DESC']],
    limit: 10,
  });
}

module.exports = { destinatariosDo, descreverPublico, enviar, avisosDoPortal };
