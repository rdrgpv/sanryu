const { Op } = require('sequelize');
const { sequelize, Lead, Turma, Unidade, Aluno, Responsavel, Matricula, Instrutor } = require('../models');
const leadService = require('../services/leadService');
const { logErro } = require('../utils/logger');

const ORIGENS = ['instagram', 'facebook', 'google', 'indicacao', 'passou_na_frente', 'evento', 'outro'];
const LIMITE_POR_HORA_IP = 10;
const pedidosPorIp = new Map();

function digitos(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function idade(dataNascimento) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dataNascimento || '');
  if (!match) return null;
  const [, ano, mes, dia] = match.map(Number);
  const agora = new Date();
  let anos = agora.getFullYear() - ano;
  if (agora.getMonth() + 1 < mes || (agora.getMonth() + 1 === mes && agora.getDate() < dia)) anos -= 1;
  return anos;
}

// Freio simples contra robô/abuso no formulário público (em memória: zera se o servidor reiniciar).
// Conta só agendamentos que passaram na validação — quem erra o telefone e corrige não é barrado.
function recentesDoIp(ip) {
  const agora = Date.now();
  const recentes = (pedidosPorIp.get(ip) || []).filter((momento) => agora - momento < 60 * 60 * 1000);
  pedidosPorIp.set(ip, recentes);
  return recentes;
}

const INCLUDE_TURMA = {
  model: Turma,
  as: 'turma',
  attributes: ['id', 'nome', 'modalidade', 'nivel', 'diaSemana', 'horaInicio', 'horaFim', 'unidadeId'],
  include: [
    { model: Unidade, as: 'unidade', attributes: ['id', 'nome', 'endereco'] },
    { model: Instrutor, as: 'instrutor', attributes: ['nome'] },
  ],
};

// ---- Público ----

async function opcoesPublicas(req, res) {
  const turmas = await Turma.findAll({
    include: [
      { model: Unidade, as: 'unidade', attributes: ['id', 'nome', 'endereco', 'ativo'] },
      { model: Instrutor, as: 'instrutor', attributes: ['nome'] },
    ],
    order: [['nome', 'ASC']],
  });

  res.json(
    turmas
      .filter((turma) => !turma.unidade || turma.unidade.ativo)
      .map((turma) => ({
        id: turma.id,
        nome: turma.nome,
        modalidade: turma.modalidade,
        nivel: turma.nivel,
        diaSemana: turma.diaSemana,
        horario: `${turma.horaInicio}–${turma.horaFim}`,
        instrutor: turma.instrutor?.nome || null,
        unidade: turma.unidade ? { nome: turma.unidade.nome, endereco: turma.unidade.endereco } : null,
        datas: leadService.proximasDatas(turma),
      }))
      .filter((turma) => turma.datas.length > 0)
  );
}

async function agendarPublico(req, res) {
  // Campo "site" fica escondido no formulário: gente não preenche, robô costuma preencher.
  if (req.body.site) return res.json({ ok: true });

  const nome = (req.body.nome || '').trim();
  const telefone = (req.body.telefone || '').trim();
  const email = (req.body.email || '').trim();
  const dataNascimento = req.body.dataNascimento || null;
  const nomeResponsavel = (req.body.nomeResponsavel || '').trim();
  const origem = ORIGENS.includes(req.body.origem) ? req.body.origem : null;

  if (!nome) return res.status(400).json({ error: 'Informe o nome de quem vai fazer a aula.' });
  if (digitos(telefone).length < 10) return res.status(400).json({ error: 'Informe um WhatsApp com DDD.' });
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'E-mail inválido.' });
  if (!req.body.aceiteContato) return res.status(400).json({ error: 'Para agendar, autorize o contato da academia.' });

  const anos = idade(dataNascimento);
  if (anos !== null && anos < 18 && !nomeResponsavel) {
    return res.status(400).json({ error: 'Para menores de 18 anos, informe o nome do responsável.' });
  }

  let turma = null;
  let dataAula = null;
  if (req.body.turmaId) {
    turma = await Turma.findByPk(req.body.turmaId);
    if (!turma) return res.status(400).json({ error: 'Turma não encontrada.' });
    if (req.body.dataAula) {
      if (!leadService.proximasDatas(turma).includes(req.body.dataAula)) {
        return res.status(400).json({ error: 'Esse dia não está disponível para essa turma. Escolha outro.' });
      }
      dataAula = req.body.dataAula;
    }
  }

  const recentes = recentesDoIp(req.ip || 'sem-ip');
  if (recentes.length >= LIMITE_POR_HORA_IP) {
    return res.status(429).json({ error: 'Muitos agendamentos seguidos. Tente de novo mais tarde ou fale com a gente pelo WhatsApp.' });
  }
  recentes.push(Date.now());

  try {
    // Mesmo telefone já agendado na mesma aula: não duplica (ex.: clicou duas vezes).
    const repetido = dataAula
      ? await Lead.findOne({ where: { telefone, turmaId: turma.id, dataAula, status: { [Op.in]: ['agendado', 'novo'] } } })
      : null;

    const lead =
      repetido ||
      (await Lead.create({
        nome,
        telefone,
        email: email || null,
        dataNascimento,
        nomeResponsavel: nomeResponsavel || null,
        turmaId: turma?.id || null,
        unidadeId: turma?.unidadeId || null,
        dataAula,
        status: dataAula ? 'agendado' : 'novo',
        origem,
        observacoes: (req.body.observacoes || '').trim().slice(0, 1000) || null,
      }));

    if (!repetido && dataAula) leadService.enviarEmailAula(lead, 'confirmacao').catch(() => {});

    res.status(repetido ? 200 : 201).json({
      ok: true,
      agendado: Boolean(dataAula),
      data: dataAula ? leadService.formatarData(dataAula) : null,
    });
  } catch (err) {
    logErro('Erro ao agendar aula experimental:', err);
    res.status(500).json({ error: 'Não foi possível agendar agora. Tente de novo ou fale com a gente pelo WhatsApp.' });
  }
}

// ---- Admin ----

async function listar(req, res) {
  const { status, busca } = req.query;
  const where = {};
  if (status) where.status = status;
  if (busca) where[Op.or] = [{ nome: { [Op.like]: `%${busca}%` } }, { telefone: { [Op.like]: `%${busca}%` } }, { nomeResponsavel: { [Op.like]: `%${busca}%` } }];

  const leads = await Lead.findAll({ where, include: INCLUDE_TURMA, order: [['createdAt', 'DESC']] });
  const contagem = await Lead.findAll({ attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'total']], group: ['status'], raw: true });

  res.json({ leads, contagem: Object.fromEntries(contagem.map((linha) => [linha.status, Number(linha.total)])) });
}

function dadosLead(body) {
  const dados = {};
  ['nome', 'telefone', 'email', 'dataNascimento', 'nomeResponsavel', 'turmaId', 'dataAula', 'status', 'origem', 'observacoes', 'motivoDesistencia'].forEach((campo) => {
    if (body[campo] === undefined) return;
    const valor = typeof body[campo] === 'string' ? body[campo].trim() : body[campo];
    dados[campo] = valor === '' ? null : valor;
  });
  if (dados.status && !Lead.STATUS.includes(dados.status)) delete dados.status;
  return dados;
}

async function criar(req, res) {
  const dados = dadosLead(req.body);
  if (!dados.nome || digitos(dados.telefone).length < 10) return res.status(400).json({ error: 'Informe nome e telefone com DDD.' });

  if (dados.turmaId) {
    const turma = await Turma.findByPk(dados.turmaId);
    dados.unidadeId = turma?.unidadeId || null;
  }
  if (!dados.status) dados.status = dados.dataAula ? 'agendado' : 'novo';

  try {
    res.status(201).json(await Lead.create(dados));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function atualizar(req, res) {
  const lead = await Lead.findByPk(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Interessado não encontrado.' });

  const dados = dadosLead(req.body);
  if (dados.status === 'matriculado' && !lead.alunoId) {
    return res.status(400).json({ error: 'Use "Converter em aluno" para matricular.' });
  }
  if (dados.turmaId !== undefined) {
    const turma = dados.turmaId ? await Turma.findByPk(dados.turmaId) : null;
    dados.unidadeId = turma?.unidadeId || null;
  }
  // Remarcou a aula: o lembrete da nova data ainda não foi.
  if (dados.dataAula && dados.dataAula !== lead.dataAula) dados.lembreteEnviadoEm = null;

  try {
    await lead.update(dados);
    res.json(lead);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Cria o aluno (e o responsável, se for criança) a partir do interessado e matricula na turma da
// aula experimental. O cadastro completo (CPF, endereço, saúde) e o contrato vêm depois, no admin.
async function converter(req, res) {
  const lead = await Lead.findByPk(req.params.id, { include: INCLUDE_TURMA });
  if (!lead) return res.status(404).json({ error: 'Interessado não encontrado.' });
  if (lead.alunoId) return res.status(400).json({ error: 'Este interessado já virou aluno.', alunoId: lead.alunoId });

  try {
    const aluno = await sequelize.transaction(async (transaction) => {
      let responsavel = null;
      if (lead.nomeResponsavel) {
        responsavel = await Responsavel.create({ nome: lead.nomeResponsavel, telefone: lead.telefone, email: lead.email }, { transaction });
      }

      const unidades = lead.unidadeId ? [] : await Unidade.findAll({ where: { ativo: true }, attributes: ['id'], transaction });
      const novo = await Aluno.create(
        {
          nome: lead.nome,
          dataNascimento: lead.dataNascimento,
          // Criança: contato fica no responsável; adulto: no próprio aluno.
          telefone: responsavel ? null : lead.telefone,
          email: lead.email,
          responsavelId: responsavel?.id || null,
          unidadeId: lead.unidadeId || (unidades.length === 1 ? unidades[0].id : null),
          dataInicio: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }),
          observacoes: lead.observacoes,
        },
        { transaction }
      );

      if (lead.turmaId) await Matricula.create({ alunoId: novo.id, turmaId: lead.turmaId }, { transaction });
      await lead.update({ status: 'matriculado', alunoId: novo.id }, { transaction });
      return novo;
    });

    res.json({ alunoId: aluno.id });
  } catch (err) {
    logErro('Erro ao converter interessado em aluno:', err);
    res.status(400).json({ error: err.message });
  }
}

// LGPD: o interessado pode pedir pra apagar os dados.
async function remover(req, res) {
  await Lead.destroy({ where: { id: req.params.id } });
  res.status(204).send();
}

module.exports = { ORIGENS, opcoesPublicas, agendarPublico, listar, criar, atualizar, converter, remover };
