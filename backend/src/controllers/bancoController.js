const { Banco } = require('../models');

async function listar(req, res) {
  const bancos = await Banco.findAll({ order: [['id', 'ASC']] });
  res.json(bancos);
}

async function buscarPorId(req, res) {
  const banco = await Banco.findByPk(req.params.id);

  if (!banco) {
    return res.status(404).json({ error: 'Configuração de conta Pix não encontrada.' });
  }

  res.json(banco);
}

async function criar(req, res) {
  try {
    const banco = await Banco.create(req.body);
    res.status(201).json(banco);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function atualizar(req, res) {
  const banco = await Banco.findByPk(req.params.id);

  if (!banco) {
    return res.status(404).json({ error: 'Configuração de conta Pix não encontrada.' });
  }

  try {
    await banco.update(req.body);
    res.json(banco);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remover(req, res) {
  const banco = await Banco.findByPk(req.params.id);

  if (!banco) {
    return res.status(404).json({ error: 'Configuração de conta Pix não encontrada.' });
  }

  await banco.destroy();
  res.status(204).send();
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
