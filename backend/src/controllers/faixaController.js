const { Faixa } = require('../models');

async function listar(req, res) {
  const faixas = await Faixa.findAll({ order: [['ordem', 'ASC']] });
  res.json(faixas);
}

// Usado pela tela pública de inscrição para descobrir a próxima faixa na ordem da graduação e
// desenhar a cor — sem os valores de exame (dado interno de gestão do dojo).
async function listarPublico(req, res) {
  const faixas = await Faixa.findAll({
    where: { ativo: true },
    attributes: ['id', 'nome', 'ordem', 'cor'],
    order: [['ordem', 'ASC']],
  });

  res.json(faixas);
}

async function buscarPorId(req, res) {
  const faixa = await Faixa.findByPk(req.params.id);

  if (!faixa) {
    return res.status(404).json({ error: 'Faixa não encontrada.' });
  }

  res.json(faixa);
}

async function criar(req, res) {
  try {
    const faixa = await Faixa.create(req.body);
    res.status(201).json(faixa);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function atualizar(req, res) {
  const faixa = await Faixa.findByPk(req.params.id);

  if (!faixa) {
    return res.status(404).json({ error: 'Faixa não encontrada.' });
  }

  try {
    await faixa.update(req.body);
    res.json(faixa);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remover(req, res) {
  const faixa = await Faixa.findByPk(req.params.id);

  if (!faixa) {
    return res.status(404).json({ error: 'Faixa não encontrada.' });
  }

  await faixa.destroy();
  res.status(204).send();
}

module.exports = { listar, listarPublico, buscarPorId, criar, atualizar, remover };
