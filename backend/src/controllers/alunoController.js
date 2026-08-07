const { Aluno, Turma, Matricula } = require('../models');

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
    include: [{ model: Turma, as: 'turmas', through: { attributes: ['status', 'dataMatricula'] } }],
    order: [['nome', 'ASC']],
  });

  res.json(alunos);
}

async function buscarPorId(req, res) {
  const aluno = await Aluno.findByPk(req.params.id, {
    include: [{ model: Turma, as: 'turmas', through: { attributes: ['status', 'dataMatricula'] } }],
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

module.exports = { listar, buscarPorId, criar, atualizar, remover, matricular };
