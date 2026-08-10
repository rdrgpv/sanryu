const { TipoEvento } = require('../models');

const TIPO_EXAME_DE_FAIXA_ID = 1;

async function listar(req, res) {
  const tipos = await TipoEvento.findAll({ order: [['id', 'ASC']] });
  res.json(tipos);
}

async function buscarPorId(req, res) {
  const tipo = await TipoEvento.findByPk(req.params.id);

  if (!tipo) {
    return res.status(404).json({ error: 'Tipo de evento não encontrado.' });
  }

  res.json(tipo);
}

async function criar(req, res) {
  try {
    const tipo = await TipoEvento.create(req.body);
    res.status(201).json(tipo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function atualizar(req, res) {
  const tipo = await TipoEvento.findByPk(req.params.id);

  if (!tipo) {
    return res.status(404).json({ error: 'Tipo de evento não encontrado.' });
  }

  try {
    await tipo.update(req.body);
    res.json(tipo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remover(req, res) {
  const tipo = await TipoEvento.findByPk(req.params.id);

  if (!tipo) {
    return res.status(404).json({ error: 'Tipo de evento não encontrado.' });
  }

  if (tipo.id === TIPO_EXAME_DE_FAIXA_ID) {
    return res.status(400).json({ error: 'O tipo de evento padrão "Exame de Faixa" não pode ser excluído.' });
  }

  await tipo.destroy();
  res.status(204).send();
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
