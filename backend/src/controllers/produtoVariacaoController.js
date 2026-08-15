const { Op } = require('sequelize');
const { sequelize, ProdutoVariacao, Produto, Cor, Tamanho, EstoqueMovimentacao } = require('../models');
const estoqueService = require('../services/estoqueService');

const INCLUDES = [
  { model: Produto, as: 'produto' },
  { model: Cor, as: 'cor' },
  { model: Tamanho, as: 'tamanho' },
];

async function listar(req, res) {
  const where = {};
  if (req.query.ativo !== undefined) where.ativo = req.query.ativo === 'true';
  if (req.query.produtoId) where.produtoId = req.query.produtoId;

  const variacoes = await ProdutoVariacao.findAll({ where, include: INCLUDES, order: [['id', 'ASC']] });
  res.json(await estoqueService.anexarSaldos(variacoes));
}

async function buscarPorId(req, res) {
  const variacao = await ProdutoVariacao.findByPk(req.params.id, { include: INCLUDES });

  if (!variacao) {
    return res.status(404).json({ error: 'Variação não encontrada.' });
  }

  res.json(await estoqueService.anexarSaldos(variacao));
}

// A combinação (produtoId, corId, tamanhoId) precisa ser única entre variações ativas — cor/tamanho
// nulos contam como parte da combinação (ex.: um produto sem grade de cor pode ter só uma variação
// "base"). Checagem em código, não índice de banco: NULL não colide em índice único, e "só entre
// ativos" não dá pra expressar de forma simples num setup dual MySQL/SQLite.
async function verificarCombinacaoDuplicada({ produtoId, corId, tamanhoId }, idAtual) {
  const where = {
    produtoId,
    corId: corId ?? null,
    tamanhoId: tamanhoId ?? null,
    ativo: true,
  };
  if (idAtual) where.id = { [Op.ne]: idAtual };
  return ProdutoVariacao.findOne({ where });
}

async function criar(req, res) {
  const { produtoId, corId, tamanhoId, valorCusto, valorVenda, ativo } = req.body;

  try {
    const produto = await Produto.findByPk(produtoId);
    if (!produto) {
      return res.status(400).json({ error: 'Produto inválido.' });
    }
    if (corId) {
      const cor = await Cor.findByPk(corId);
      if (!cor || !cor.ativo) return res.status(400).json({ error: 'Cor inválida ou inativa.' });
    }
    if (tamanhoId) {
      const tamanho = await Tamanho.findByPk(tamanhoId);
      if (!tamanho || !tamanho.ativo) return res.status(400).json({ error: 'Tamanho inválido ou inativo.' });
    }
    if (await verificarCombinacaoDuplicada({ produtoId, corId, tamanhoId })) {
      return res.status(400).json({ error: 'Já existe uma variação ativa com esta combinação de cor e tamanho.' });
    }

    const variacao = await sequelize.transaction(async (t) => {
      const nova = await ProdutoVariacao.create(
        {
          produtoId,
          corId: corId || null,
          tamanhoId: tamanhoId || null,
          valorCusto: valorCusto || 0,
          valorVenda: valorVenda || 0,
          quantidadeEstoque: 0,
          ativo: ativo !== undefined ? ativo : true,
          codigo: 'TEMP',
        },
        { transaction: t }
      );
      // Código só existe depois do insert (precisa do id real) — gerado aqui, nunca aceito do cliente.
      await nova.update({ codigo: `VAR-${String(nova.id).padStart(6, '0')}` }, { transaction: t });
      return nova;
    });

    res.status(201).json(await variacao.reload({ include: INCLUDES }));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function atualizar(req, res) {
  const variacao = await ProdutoVariacao.findByPk(req.params.id);

  if (!variacao) {
    return res.status(404).json({ error: 'Variação não encontrada.' });
  }

  // codigo e quantidadeEstoque são imutáveis por aqui — codigo é gerado uma vez na criação,
  // estoque só muda via EstoqueMovimentacao.
  const { codigo, quantidadeEstoque, ...dados } = req.body;

  const produtoId = dados.produtoId ?? variacao.produtoId;
  const corId = dados.corId !== undefined ? dados.corId : variacao.corId;
  const tamanhoId = dados.tamanhoId !== undefined ? dados.tamanhoId : variacao.tamanhoId;

  try {
    if (await verificarCombinacaoDuplicada({ produtoId, corId, tamanhoId }, variacao.id)) {
      return res.status(400).json({ error: 'Já existe uma variação ativa com esta combinação de cor e tamanho.' });
    }

    await variacao.update(dados);
    res.json(await variacao.reload({ include: INCLUDES }));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remover(req, res) {
  const variacao = await ProdutoVariacao.findByPk(req.params.id);

  if (!variacao) {
    return res.status(404).json({ error: 'Variação não encontrada.' });
  }

  const totalMovimentacoes = await EstoqueMovimentacao.count({ where: { produtoVariacaoId: variacao.id } });
  if (totalMovimentacoes > 0) {
    return res.status(400).json({ error: 'Existem movimentações de estoque para esta variação. Inative-a em vez de excluir.' });
  }

  await variacao.destroy();
  res.status(204).send();
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
