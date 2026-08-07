const { Instrutor } = require('../models');

async function listar(req, res) {
  const instrutores = await Instrutor.findAll({ order: [['nome', 'ASC']] });
  res.json(instrutores);
}

async function buscarPorId(req, res) {
  const instrutor = await Instrutor.findByPk(req.params.id);

  if (!instrutor) {
    return res.status(404).json({ error: 'Instrutor não encontrado.' });
  }

  res.json(instrutor);
}

async function criar(req, res) {
  try {
    const instrutor = await Instrutor.create(req.body);
    res.status(201).json(instrutor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function atualizar(req, res) {
  const instrutor = await Instrutor.findByPk(req.params.id);

  if (!instrutor) {
    return res.status(404).json({ error: 'Instrutor não encontrado.' });
  }

  try {
    await instrutor.update(req.body);
    res.json(instrutor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remover(req, res) {
  const instrutor = await Instrutor.findByPk(req.params.id);

  if (!instrutor) {
    return res.status(404).json({ error: 'Instrutor não encontrado.' });
  }

  await instrutor.destroy();
  res.status(204).send();
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
