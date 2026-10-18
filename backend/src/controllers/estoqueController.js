const { Op, fn, col } = require('sequelize');
const { sequelize, ProdutoVariacao, Produto, Cor, Tamanho, PedidoCompra, PedidoCompraItem, Fornecedor, EstoqueMovimentacao, Inventario } = require('../models');
const estoqueService = require('../services/estoqueService');
const { logErro } = require('../utils/logger');

const INCLUDES_VARIACAO = [
  { model: Produto, as: 'produto', attributes: ['id', 'descricao', 'controlaEstoque', 'ativo'] },
  { model: Cor, as: 'cor', attributes: ['descricao'] },
  { model: Tamanho, as: 'tamanho', attributes: ['descricao'] },
];

function descricao(variacao) {
  return [variacao.produto?.descricao, variacao.cor?.descricao, variacao.tamanho?.descricao].filter(Boolean).join(' · ');
}

function arredondar(valor) {
  return Math.round(valor * 100) / 100;
}

// Quanto ainda vai chegar de compras abertas (pedido de compra não recebido nem cancelado), por variação.
async function emTransito(ids) {
  if (!ids.length) return {};
  const itens = await PedidoCompraItem.findAll({
    where: { produtoVariacaoId: ids },
    include: { model: PedidoCompra, as: 'pedidoCompra', attributes: [], where: { situacao: ['P', 'X', 'PG'] } },
    attributes: ['produtoVariacaoId', 'quantidade', 'quantidadeRecebida'],
  });
  const mapa = {};
  itens.forEach((item) => {
    mapa[item.produtoVariacaoId] = (mapa[item.produtoVariacaoId] || 0) + (item.quantidade - item.quantidadeRecebida);
  });
  return mapa;
}

async function variacoesControladas() {
  return ProdutoVariacao.findAll({
    where: { ativo: true },
    include: [{ ...INCLUDES_VARIACAO[0], where: { ativo: true, controlaEstoque: true } }, INCLUDES_VARIACAO[1], INCLUDES_VARIACAO[2]],
  });
}

// ---- Reposição ----

// Abaixo (ou no) mínimo, considerando o disponível (estoque − reservado) e o que já está a caminho.
// Sugestão = completar até o ideal (ou o dobro do mínimo).
async function reposicao(req, res) {
  const variacoes = (await variacoesControladas()).filter((variacao) => variacao.estoqueMinimo > 0);
  const comSaldo = await estoqueService.anexarSaldos(variacoes);
  const chegando = await emTransito(variacoes.map((variacao) => variacao.id));

  const linhas = comSaldo
    .map((variacao) => {
      const aCaminho = chegando[variacao.id] || 0;
      const ideal = variacao.estoqueIdeal || variacao.estoqueMinimo * 2;
      const projetado = variacao.saldoDisponivel + aCaminho;
      return {
        id: variacao.id,
        codigo: variacao.codigo,
        descricao: descricao(variacao),
        estoque: variacao.quantidadeEstoque,
        reservado: variacao.quantidadeReservada,
        disponivel: variacao.saldoDisponivel,
        aCaminho,
        minimo: variacao.estoqueMinimo,
        ideal,
        sugestao: Math.max(0, ideal - projetado),
        valorCusto: Number(variacao.valorCusto),
      };
    })
    .filter((linha) => linha.disponivel <= linha.minimo)
    .sort((a, b) => a.disponivel - a.minimo - (b.disponivel - b.minimo));

  res.json(linhas);
}

// Gera um pedido de compra de reposição (sem encomenda de cliente por trás) pro fornecedor escolhido.
async function gerarCompraReposicao(req, res) {
  const itens = (req.body.itens || []).filter((item) => Number(item.quantidade) > 0);
  const fornecedor = await Fornecedor.findByPk(req.body.fornecedorId);
  if (!fornecedor) return res.status(400).json({ error: 'Escolha o fornecedor.' });
  if (!itens.length) return res.status(400).json({ error: 'Informe a quantidade de pelo menos um item.' });

  try {
    const compra = await sequelize.transaction(async (transaction) => {
      const variacoes = await ProdutoVariacao.findAll({ where: { id: itens.map((item) => item.produtoVariacaoId) }, transaction });
      const nova = await PedidoCompra.create(
        { fornecedorId: fornecedor.id, dataPedido: new Date(), situacao: 'P', valorTotal: 0, observacao: 'Reposição de estoque (abaixo do mínimo).' },
        { transaction }
      );
      let total = 0;
      for (const item of itens) {
        const variacao = variacoes.find((linha) => linha.id === Number(item.produtoVariacaoId));
        if (!variacao) throw new Error(`Variação ${item.produtoVariacaoId} não encontrada.`);
        const quantidade = Number.parseInt(item.quantidade, 10);
        const valorUnitario = Number(variacao.valorCusto);
        total += valorUnitario * quantidade;
        await PedidoCompraItem.create({ pedidoCompraId: nova.id, produtoVariacaoId: variacao.id, quantidade, valorUnitario, valorTotal: arredondar(valorUnitario * quantidade) }, { transaction });
      }
      await nova.update({ valorTotal: arredondar(total) }, { transaction });
      return nova;
    });
    res.status(201).json({ id: compra.id, valorTotal: Number(compra.valorTotal) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// ---- Inventário ----

async function listarParaContagem(req, res) {
  const where = { ativo: true };
  const filtroProduto = { ativo: true, controlaEstoque: true, ...(req.query.produtoId ? { id: req.query.produtoId } : {}) };
  const variacoes = await ProdutoVariacao.findAll({
    where,
    include: [{ ...INCLUDES_VARIACAO[0], where: filtroProduto }, INCLUDES_VARIACAO[1], INCLUDES_VARIACAO[2]],
    order: [[{ model: Produto, as: 'produto' }, 'descricao', 'ASC'], ['id', 'ASC']],
  });
  res.json(variacoes.map((variacao) => ({ id: variacao.id, codigo: variacao.codigo, descricao: descricao(variacao), produtoId: variacao.produtoId, estoque: variacao.quantidadeEstoque, valorCusto: Number(variacao.valorCusto) })));
}

// Aplica a contagem: a diferença (contado − registrado AGORA) vira movimentação. Itens sem número
// digitado são ignorados (contagem parcial vale).
async function aplicarInventario(req, res) {
  const contagens = (req.body.itens || []).filter((item) => item.contado !== '' && item.contado !== null && item.contado !== undefined);
  if (!contagens.length) return res.status(400).json({ error: 'Digite a quantidade contada de pelo menos um item.' });
  if (contagens.some((item) => !Number.isInteger(Number(item.contado)) || Number(item.contado) < 0)) {
    return res.status(400).json({ error: 'As quantidades contadas devem ser números inteiros a partir de zero.' });
  }

  try {
    const inventario = await sequelize.transaction(async (transaction) => {
      const registro = await Inventario.create({ motivo: (req.body.motivo || '').trim() || null, criadoPorId: req.admin.id }, { transaction });
      let ajustados = 0;
      let valorDiferenca = 0;

      for (const item of contagens) {
        const variacao = await ProdutoVariacao.findByPk(item.produtoVariacaoId, { transaction });
        if (!variacao) continue;
        const diferenca = Number(item.contado) - variacao.quantidadeEstoque;
        if (diferenca === 0) continue;

        const tipo = diferenca > 0 ? 'A' : 'S';
        await EstoqueMovimentacao.create(
          {
            produtoVariacaoId: variacao.id,
            tipoMovimentacao: tipo,
            quantidade: Math.abs(diferenca),
            documentoOrigem: `Inventário #${registro.id}`,
            dataMovimentacao: new Date(),
            observacao: `Contado ${item.contado}, registrado ${variacao.quantidadeEstoque}${registro.motivo ? ` — ${registro.motivo}` : ''}`,
          },
          { transaction }
        );
        await estoqueService.aplicarMovimento(variacao, tipo, Math.abs(diferenca), transaction);
        ajustados += 1;
        valorDiferenca += diferenca * Number(variacao.valorCusto);
      }

      await registro.update({ itensContados: contagens.length, itensAjustados: ajustados, valorDiferenca: arredondar(valorDiferenca) }, { transaction });
      return registro;
    });
    res.status(201).json(inventario);
  } catch (err) {
    logErro('Erro ao aplicar inventário:', err);
    res.status(500).json({ error: 'Não foi possível aplicar o inventário.' });
  }
}

async function historicoInventarios(req, res) {
  res.json(await Inventario.findAll({ order: [['createdAt', 'DESC']], limit: 50 }));
}

// ---- Painel ----

// Valor parado em estoque (custo e venda), itens abaixo do mínimo, mais vendidos e parados — tudo a
// partir das saídas de venda (movimentos "S" ligados a item de pedido) dos últimos N dias.
async function painel(req, res) {
  const dias = Math.min(365, Math.max(7, Number(req.query.dias) || 90));
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
  const variacoes = await variacoesControladas();
  const comSaldo = await estoqueService.anexarSaldos(variacoes);

  const vendas = await EstoqueMovimentacao.findAll({
    where: { tipoMovimentacao: 'S', pedidoItemId: { [Op.ne]: null }, dataMovimentacao: { [Op.gte]: desde } },
    attributes: ['produtoVariacaoId', [fn('SUM', col('quantidade')), 'total']],
    group: ['produtoVariacaoId'],
    raw: true,
  });
  const vendidoPorVariacao = new Map(vendas.map((linha) => [linha.produtoVariacaoId, Number(linha.total)]));

  const linhas = comSaldo.map((variacao) => ({
    id: variacao.id,
    codigo: variacao.codigo,
    descricao: descricao(variacao),
    estoque: variacao.quantidadeEstoque,
    disponivel: variacao.saldoDisponivel,
    minimo: variacao.estoqueMinimo,
    custo: Number(variacao.valorCusto),
    venda: Number(variacao.valorVenda),
    vendidos: vendidoPorVariacao.get(variacao.id) || 0,
  }));

  const emEstoque = linhas.filter((linha) => linha.estoque > 0);
  res.json({
    dias,
    valorCusto: arredondar(emEstoque.reduce((total, linha) => total + linha.estoque * linha.custo, 0)),
    valorVenda: arredondar(emEstoque.reduce((total, linha) => total + linha.estoque * linha.venda, 0)),
    unidades: emEstoque.reduce((total, linha) => total + linha.estoque, 0),
    abaixoDoMinimo: linhas.filter((linha) => linha.minimo > 0 && linha.disponivel <= linha.minimo).length,
    maisVendidos: linhas
      .filter((linha) => linha.vendidos > 0)
      .sort((a, b) => b.vendidos - a.vendidos)
      .slice(0, 10)
      .map((linha) => ({ ...linha, margem: linha.venda > 0 ? Math.round(((linha.venda - linha.custo) / linha.venda) * 100) : null })),
    parados: emEstoque
      .filter((linha) => linha.vendidos === 0)
      .sort((a, b) => b.estoque * b.custo - a.estoque * a.custo)
      .slice(0, 10)
      .map((linha) => ({ ...linha, valorParado: arredondar(linha.estoque * linha.custo) })),
  });
}

module.exports = { reposicao, gerarCompraReposicao, listarParaContagem, aplicarInventario, historicoInventarios, painel };
