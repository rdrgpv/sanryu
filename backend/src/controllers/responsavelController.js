const { Op } = require('sequelize');
const { Responsavel, Aluno } = require('../models');

const INCLUDE_ALUNOS = { model: Aluno, as: 'alunos', attributes: ['id', 'nome', 'situacao', 'parentescoResponsavel'] };

async function listar(req, res) {
  const { busca } = req.query;
  const where = {};

  if (busca) {
    where[Op.or] = [
      { nome: { [Op.like]: `%${busca}%` } },
      { cpf: { [Op.like]: `%${busca}%` } },
      { email: { [Op.like]: `%${busca}%` } },
    ];
  }

  const responsaveis = await Responsavel.findAll({ where, include: INCLUDE_ALUNOS, order: [['nome', 'ASC']] });
  res.json(responsaveis);
}

async function buscarPorId(req, res) {
  const responsavel = await Responsavel.findByPk(req.params.id, { include: INCLUDE_ALUNOS });

  if (!responsavel) {
    return res.status(404).json({ error: 'Responsável não encontrado.' });
  }

  res.json(responsavel);
}

async function criar(req, res) {
  try {
    const responsavel = await Responsavel.create(req.body);
    res.status(201).json(responsavel);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function atualizar(req, res) {
  const responsavel = await Responsavel.findByPk(req.params.id);

  if (!responsavel) {
    return res.status(404).json({ error: 'Responsável não encontrado.' });
  }

  try {
    await responsavel.update(req.body);
    res.json(responsavel);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remover(req, res) {
  const responsavel = await Responsavel.findByPk(req.params.id);

  if (!responsavel) {
    return res.status(404).json({ error: 'Responsável não encontrado.' });
  }

  const alunos = await Aluno.count({ where: { responsavelId: responsavel.id } });

  if (alunos > 0) {
    return res.status(400).json({ error: `Este responsável está ligado a ${alunos} aluno(s). Troque o responsável deles antes.` });
  }

  await responsavel.destroy();
  res.status(204).send();
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
