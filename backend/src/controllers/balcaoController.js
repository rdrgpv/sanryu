const { Op } = require('sequelize');
const { sequelize, Pedido, ProdutoVariacao, Produto, Cor, Tamanho, Lancamento } = require('../models');
const pedidoService = require('../services/pedidoService');
const estoqueService = require('../services/estoqueService');
const financeiroService = require('../services/financeiroService');
const { hoje } = require('../services/mensalidadeService');
const { logErro } = require('../utils/logger');

const FORMAS = ['dinheiro', 'pix', 'cartao', 'transferencia', 'outro'];

function descricaoVariacao(variacao) {
  return [variacao.produto?.descricao, variacao.cor?.descricao, variacao.tamanho?.descricao].filter(Boolean).join(' · ');
}

// Busca pro caixa: código exato (leitor de código de barras digita o VAR-000123 e dá Enter) ou
// pedaço do nome do produto. Só variações ativas de produtos ativos, com o disponível pra venda.
async function buscarProdutos(req, res) {
  const busca = String(req.query.busca || '').trim();
  if (!busca) return res.json([]);

  const variacoes = await ProdutoVariacao.findAll({
    where: { ativo: true, [Op.or]: [{ codigo: busca.toUpperCase() }, { '$produto.descricao$': { [Op.like]: `%${busca}%` } }] },
    include: [
      { model: Produto, as: 'produto', where: { ativo: true }, attributes: ['id', 'descricao', 'controlaEstoque'] },
      { model: Cor, as: 'cor', attributes: ['descricao'] },
      { model: Tamanho, as: 'tamanho', attributes: ['descricao'] },
    ],
    order: [[{ model: Produto, as: 'produto' }, 'descricao', 'ASC']],
    limit: 30,
    // Filtro no produto incluído + limit: sem isto o Sequelize monta subconsulta e o filtro quebra.
    subQuery: false,
  });

  const comSaldo = await estoqueService.anexarSaldos(variacoes);
  res.json(
    comSaldo.map((variacao) => ({
      id: variacao.id,
      codigo: variacao.codigo,
      descricao: descricaoVariacao(variacao),
      valorVenda: Number(variacao.valorVenda),
      controlaEstoque: variacao.produto?.controlaEstoque !== false,
      disponivel: variacao.saldoDisponivel,
      exato: variacao.codigo === busca.toUpperCase(),
    }))
  );
}

// Venda no balcão: confere o disponível (bloqueia se faltar), grava como pedido do canal "balcao",
// dá baixa no estoque (mesma rotina da entrega de encomenda) e registra o recebimento no financeiro
// na conta da forma de pagamento. Preço sempre do cadastro (não do que o navegador manda).
async function vender(req, res) {
  const itens = (req.body.itens || []).filter((item) => Number(item.quantidade) > 0);
  const formaPagamento = req.body.formaPagamento;
  const desconto = Math.max(0, Number(req.body.valorDesconto) || 0);

  if (itens.length === 0) return res.status(400).json({ error: 'Adicione pelo menos um produto.' });
  if (!FORMAS.includes(formaPagamento)) return res.status(400).json({ error: 'Escolha a forma de pagamento.' });
  if (itens.some((item) => !Number.isInteger(Number(item.quantidade)))) return res.status(400).json({ error: 'Quantidade inválida.' });

  try {
    const pedido = await sequelize.transaction(async (transaction) => {
      const faltas = await estoqueService.faltasParaVenda(itens, { transaction });
      if (faltas.length) {
        const erro = new Error(estoqueService.mensagemFaltas(faltas));
        erro.status = 400;
        throw erro;
      }

      const variacoes = await ProdutoVariacao.findAll({ where: { id: itens.map((item) => item.produtoVariacaoId) }, transaction });
      const preco = new Map(variacoes.map((variacao) => [variacao.id, Number(variacao.valorVenda)]));
      const subtotal = itens.reduce((total, item) => total + preco.get(Number(item.produtoVariacaoId)) * Number(item.quantidade), 0);
      if (desconto > subtotal) {
        const erro = new Error('O desconto é maior que o total da venda.');
        erro.status = 400;
        throw erro;
      }

      const novo = await Pedido.create(
        {
          nomeCliente: (req.body.nomeCliente || '').trim() || 'Venda no balcão',
          telefoneCliente: (req.body.telefoneCliente || '').trim() || null,
          dataPedido: new Date(),
          situacao: 'P',
          valorDesconto: desconto,
          canal: 'balcao',
          observacao: (req.body.observacao || '').trim() || null,
        },
        { transaction }
      );

      const criados = await pedidoService.salvarItens(
        novo,
        itens.map((item) => {
          const unitario = preco.get(Number(item.produtoVariacaoId));
          return { produtoVariacaoId: Number(item.produtoVariacaoId), quantidade: Number(item.quantidade), valorUnitario: unitario, valorTotal: Math.round(unitario * Number(item.quantidade) * 100) / 100 };
        }),
        transaction
      );
      await pedidoService.recalcularTotais(novo, criados, transaction);
      await pedidoService.entregar(novo, transaction);
      return novo;
    });

    // Recebimento no financeiro (fora da transação: a sincronização cria a conta a receber da venda).
    await financeiroService.sincronizarOrigens();
    const lancamento = await Lancamento.findOne({ where: { origem: 'pedido', origemId: pedido.id } });
    if (lancamento && lancamento.status === 'pendente') {
      await financeiroService.baixar(lancamento, { dataPagamento: hoje(), valorPago: Number(pedido.valorTotal), formaPagamento });
    }

    await pedido.reload();
    res.status(201).json({ id: pedido.id, valorTotal: Number(pedido.valorTotal), valorDesconto: Number(pedido.valorDesconto), formaPagamento });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    logErro('Erro na venda de balcão:', err);
    res.status(500).json({ error: 'Não foi possível concluir a venda.' });
  }
}

// Vendas do balcão de hoje (fechamento do caixa): total por forma de pagamento.
async function vendasDoDia(req, res) {
  const data = /^\d{4}-\d{2}-\d{2}$/.test(req.query.data || '') ? req.query.data : hoje();
  const inicio = new Date(`${data}T00:00:00-03:00`);
  const fim = new Date(`${data}T23:59:59.999-03:00`);

  const pedidos = await Pedido.findAll({
    where: { canal: 'balcao', dataPedido: { [Op.between]: [inicio, fim] }, situacao: { [Op.ne]: 'E' } },
    include: ['itens'],
    order: [['dataPedido', 'DESC']],
  });
  const lancamentos = await Lancamento.findAll({ where: { origem: 'pedido', origemId: pedidos.map((pedido) => pedido.id) }, attributes: ['origemId', 'formaPagamento', 'valorPago', 'status'] });
  const porPedido = new Map(lancamentos.map((lancamento) => [lancamento.origemId, lancamento]));

  const porForma = {};
  const vendas = pedidos.map((pedido) => {
    const lancamento = porPedido.get(pedido.id);
    const forma = lancamento?.formaPagamento || '-';
    porForma[forma] = Math.round(((porForma[forma] || 0) + Number(pedido.valorTotal)) * 100) / 100;
    return { id: pedido.id, hora: pedido.dataPedido, cliente: pedido.nomeCliente, itens: pedido.itens.reduce((soma, item) => soma + item.quantidade, 0), total: Number(pedido.valorTotal), forma };
  });

  res.json({ data, vendas, porForma, total: Math.round(vendas.reduce((soma, venda) => soma + venda.total, 0) * 100) / 100 });
}

module.exports = { buscarProdutos, vender, vendasDoDia };
