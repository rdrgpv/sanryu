const { Turma, Instrutor } = require('../models');

async function listar(req, res) {
  const { modalidade } = req.query;
  const where = {};

  if (modalidade) {
    where.modalidade = modalidade;
  }

  const turmas = await Turma.findAll({
    where,
    include: [{ model: Instrutor, as: 'instrutor' }],
    order: [['diaSemana', 'ASC'], ['horaInicio', 'ASC']],
  });

  res.json(turmas);
}

async function buscarPorId(req, res) {
  const turma = await Turma.findByPk(req.params.id, {
    include: [{ model: Instrutor, as: 'instrutor' }],
  });

  if (!turma) {
    return res.status(404).json({ error: 'Turma não encontrada.' });
  }

  res.json(turma);
}

async function criar(req, res) {
  try {
    const turma = await Turma.create(req.body);
    res.status(201).json(turma);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function atualizar(req, res) {
  const turma = await Turma.findByPk(req.params.id);

  if (!turma) {
    return res.status(404).json({ error: 'Turma não encontrada.' });
  }

  try {
    await turma.update(req.body);
    res.json(turma);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remover(req, res) {
  const turma = await Turma.findByPk(req.params.id);

  if (!turma) {
    return res.status(404).json({ error: 'Turma não encontrada.' });
  }

  await turma.destroy();
  res.status(204).send();
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
