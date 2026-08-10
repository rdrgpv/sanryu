const { Configuracao } = require('../models');

async function listar(req, res) {
  const configuracoes = await Configuracao.findAll({ order: [['sistema', 'ASC'], ['parametro', 'ASC']] });
  res.json(configuracoes);
}

async function buscarPorId(req, res) {
  const configuracao = await Configuracao.findByPk(req.params.id);

  if (!configuracao) {
    return res.status(404).json({ error: 'Configuração não encontrada.' });
  }

  res.json(configuracao);
}

async function criar(req, res) {
  try {
    const configuracao = await Configuracao.create(req.body);
    res.status(201).json(configuracao);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function atualizar(req, res) {
  const configuracao = await Configuracao.findByPk(req.params.id);

  if (!configuracao) {
    return res.status(404).json({ error: 'Configuração não encontrada.' });
  }

  try {
    await configuracao.update(req.body);
    res.json(configuracao);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remover(req, res) {
  const configuracao = await Configuracao.findByPk(req.params.id);

  if (!configuracao) {
    return res.status(404).json({ error: 'Configuração não encontrada.' });
  }

  await configuracao.destroy();
  res.status(204).send();
}

// Salva vários parâmetros de um mesmo sistema de uma vez (upsert por sistema+parametro), para telas
// de configuração com campos fixos e nomeados em vez de CRUD linha a linha.
async function salvarLote(req, res) {
  const { sistema, itens } = req.body;

  if (!sistema || !Array.isArray(itens)) {
    return res.status(400).json({ error: 'sistema e itens são obrigatórios.' });
  }

  try {
    const salvos = await Promise.all(
      itens.map(async (item) => {
        const [configuracao] = await Configuracao.findOrCreate({
          where: { sistema, parametro: item.parametro },
          defaults: { sistema, parametro: item.parametro, valor: item.valor ?? null, tipoParametro: item.tipoParametro || 'S' },
        });

        return configuracao.update({ valor: item.valor ?? null, tipoParametro: item.tipoParametro || 'S' });
      })
    );

    res.json(salvos);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, remover, salvarLote };
