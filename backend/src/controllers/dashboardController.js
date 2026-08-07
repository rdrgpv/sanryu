const { Op } = require('sequelize');
const { Aluno, Turma, Instrutor, Matricula } = require('../models');

async function resumo(req, res) {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [alunosAtivos, totalTurmas, totalInstrutores, matriculasDoMes] = await Promise.all([
    Aluno.count({ where: { ativo: true } }),
    Turma.count(),
    Instrutor.count(),
    Matricula.count({ where: { dataMatricula: { [Op.gte]: inicioMes.toISOString().slice(0, 10) } } }),
  ]);

  res.json({ alunosAtivos, totalTurmas, totalInstrutores, matriculasDoMes });
}

module.exports = { resumo };
