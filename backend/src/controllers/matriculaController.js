const { Matricula, Aluno, Turma } = require('../models');

async function listar(req, res) {
  const matriculas = await Matricula.findAll({
    include: [
      { model: Aluno, as: 'aluno' },
      { model: Turma, as: 'turma' },
    ],
    order: [['dataMatricula', 'DESC']],
  });

  res.json(matriculas);
}

async function criar(req, res) {
  const { alunoId, turmaId } = req.body;

  if (!alunoId || !turmaId) {
    return res.status(400).json({ error: 'alunoId e turmaId são obrigatórios.' });
  }

  try {
    const matricula = await Matricula.create({ alunoId, turmaId });
    res.status(201).json(matricula);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remover(req, res) {
  const matricula = await Matricula.findByPk(req.params.id);

  if (!matricula) {
    return res.status(404).json({ error: 'Matrícula não encontrada.' });
  }

  await matricula.destroy();
  res.status(204).send();
}

module.exports = { listar, criar, remover };
