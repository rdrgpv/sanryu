const { Plano, Unidade, Contrato } = require('../models');

async function listar(req, res) {
  const where = {};
  if (req.query.ativo !== undefined) where.ativo = req.query.ativo === 'true';

  const planos = await Plano.findAll({
    where,
    include: { model: Unidade, as: 'unidade', attributes: ['id', 'nome'] },
    order: [['nome', 'ASC']],
  });

  res.json(planos);
}

async function buscarPorId(req, res) {
  const plano = await Plano.findByPk(req.params.id);

  if (!plano) {
    return res.status(404).json({ error: 'Plano não encontrado.' });
  }

  res.json(plano);
}

function dadosPlano(body) {
  return {
    nome: body.nome,
    descricao: body.descricao || null,
    periodicidade: body.periodicidade,
    valor: body.valor,
    unidadeId: body.unidadeId || null,
    ativo: body.ativo,
  };
}

async function criar(req, res) {
  try {
    const plano = await Plano.create(dadosPlano(req.body));
    res.status(201).json(plano);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Mudar o valor do plano não mexe nos contratos já feitos — eles guardam o valor da época.
async function atualizar(req, res) {
  const plano = await Plano.findByPk(req.params.id);

  if (!plano) {
    return res.status(404).json({ error: 'Plano não encontrado.' });
  }

  try {
    await plano.update(dadosPlano(req.body));
    res.json(plano);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remover(req, res) {
  const plano = await Plano.findByPk(req.params.id);

  if (!plano) {
    return res.status(404).json({ error: 'Plano não encontrado.' });
  }

  const contratos = await Contrato.count({ where: { planoId: plano.id } });

  if (contratos > 0) {
    return res.status(400).json({ error: `Este plano tem ${contratos} contrato(s). Desative o plano em vez de excluir.` });
  }

  await plano.destroy();
  res.status(204).send();
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
