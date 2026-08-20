const { Aluno, Turma, Matricula, Faixa } = require('../models');
const gatameService = require('../services/gatameService');
const { logErro } = require('../utils/logger');

async function listar(req, res) {
  const { busca } = req.query;
  const where = {};

  if (busca) {
    const { Op } = require('sequelize');
    where[Op.or] = [
      { nome: { [Op.like]: `%${busca}%` } },
      { email: { [Op.like]: `%${busca}%` } },
    ];
  }

  const alunos = await Aluno.findAll({
    where,
    include: [
      { model: Turma, as: 'turmas', through: { attributes: ['status', 'dataMatricula'] } },
      { model: Faixa, as: 'faixa' },
    ],
    order: [['nome', 'ASC']],
  });

  res.json(alunos);
}

async function buscarPorId(req, res) {
  const aluno = await Aluno.findByPk(req.params.id, {
    include: [
      { model: Turma, as: 'turmas', through: { attributes: ['status', 'dataMatricula'] } },
      { model: Faixa, as: 'faixa' },
    ],
  });

  if (!aluno) {
    return res.status(404).json({ error: 'Aluno não encontrado.' });
  }

  res.json(aluno);
}

async function criar(req, res) {
  try {
    const aluno = await Aluno.create(req.body);
    res.status(201).json(aluno);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function atualizar(req, res) {
  const aluno = await Aluno.findByPk(req.params.id);

  if (!aluno) {
    return res.status(404).json({ error: 'Aluno não encontrado.' });
  }

  try {
    await aluno.update(req.body);
    res.json(aluno);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remover(req, res) {
  const aluno = await Aluno.findByPk(req.params.id);

  if (!aluno) {
    return res.status(404).json({ error: 'Aluno não encontrado.' });
  }

  await aluno.destroy();
  res.status(204).send();
}

async function matricular(req, res) {
  const { turmaId } = req.body;
  const aluno = await Aluno.findByPk(req.params.id);

  if (!aluno) {
    return res.status(404).json({ error: 'Aluno não encontrado.' });
  }

  const turma = await Turma.findByPk(turmaId);

  if (!turma) {
    return res.status(404).json({ error: 'Turma não encontrada.' });
  }

  const matricula = await Matricula.create({ alunoId: aluno.id, turmaId: turma.id });
  res.status(201).json(matricula);
}

// Consulta se o aluno já existe no Gatame pelo email — independente de ele ter passado pelo fluxo
// de "cadastrar no Gatame" a partir de uma inscrição (pode já existir lá por outro caminho, ex.:
// cadastro direto feito por outro instrutor).
async function verificarGatame(req, res) {
  const aluno = await Aluno.findByPk(req.params.id);

  if (!aluno) {
    return res.status(404).json({ error: 'Aluno não encontrado.' });
  }

  if (!aluno.email) {
    return res.status(400).json({ error: 'Aluno sem email cadastrado — não é possível consultar o Gatame.' });
  }

  try {
    const resultado = await gatameService.consultarAluno(aluno.email);

    if (!resultado.apto) {
      return res.json({ apto: false });
    }

    res.json({
      apto: true,
      candidatos: resultado.candidatos.map((raw) => ({
        nome: raw.nome,
        faixa: raw.faixa || null,
        origem: raw.origem,
      })),
    });
  } catch (err) {
    if (err.interno) {
      logErro('Erro de configuração ao consultar o Gatame:', err);
      return res.status(500).json({ error: 'Erro de configuração ao consultar o Gatame.' });
    }

    logErro('Erro ao consultar o Gatame:', err);
    res.status(502).json({ error: 'Não foi possível consultar o Gatame agora. Tente novamente.' });
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, remover, matricular, verificarGatame };
