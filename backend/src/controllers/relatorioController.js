const { Op } = require('sequelize');
const { Lancamento, CategoriaFinanceira, ContaFinanceira, Fornecedor, Unidade, Mensalidade, Aluno, Responsavel, Contrato, Plano, ProdutoVariacao, Produto, Cor, Tamanho, EstoqueMovimentacao, PedidoItem } = require('../models');
const financeiroService = require('../services/financeiroService');
const { hoje, valorAtualizado } = require('../services/mensalidadeService');
const { gerarCsv } = require('../utils/csv');

const FORMAS = { pix: 'Pix', dinheiro: 'Dinheiro', cartao: 'Cartão', transferencia: 'Transferência', boleto: 'Boleto', debito_automatico: 'Débito automático', isento: 'Isento', outro: 'Outro' };
const ORIGENS = { manual: 'Manual', mensalidade: 'Mensalidade', pedido: 'Venda da loja', pedidoCompra: 'Pedido de compra', recorrencia: 'Recorrente' };
const STATUS = { pendente: 'Em aberto', pago: 'Pago', cancelado: 'Cancelado' };

const INCLUDES = [
  { model: CategoriaFinanceira, as: 'categoria', attributes: ['nome'] },
  { model: ContaFinanceira, as: 'conta', attributes: ['nome'] },
  { model: Fornecedor, as: 'fornecedor', attributes: ['nome'] },
  { model: Unidade, as: 'unidade', attributes: ['nome'] },
];

const COLUNAS_LANCAMENTO = [
  { titulo: 'Tipo', valor: (linha) => (linha.tipo === 'receita' ? 'Receita' : 'Despesa') },
  { titulo: 'Descrição', valor: (linha) => linha.descricao },
  { titulo: 'Categoria', valor: (linha) => linha.categoria?.nome || 'Sem categoria' },
  { titulo: 'Fornecedor', valor: (linha) => linha.fornecedor?.nome || '' },
  { titulo: 'Unidade', valor: (linha) => linha.unidade?.nome || '' },
  { titulo: 'Vencimento', valor: (linha) => linha.vencimento, tipo: 'data' },
  { titulo: 'Valor previsto', valor: (linha) => linha.valor, tipo: 'numero' },
  { titulo: 'Situação', valor: (linha) => STATUS[linha.status] || linha.status },
  { titulo: 'Data do pagamento', valor: (linha) => linha.dataPagamento, tipo: 'data' },
  { titulo: 'Valor pago', valor: (linha) => linha.valorPago, tipo: 'numero' },
  { titulo: 'Forma', valor: (linha) => FORMAS[linha.formaPagamento] || linha.formaPagamento || '' },
  { titulo: 'Conta', valor: (linha) => linha.conta?.nome || '' },
  { titulo: 'Origem', valor: (linha) => ORIGENS[linha.origem] || linha.origem },
  { titulo: 'Observações', valor: (linha) => linha.observacoes || '' },
];

function periodo(req) {
  const fim = req.query.fim || hoje();
  const inicio = req.query.inicio || `${fim.slice(0, 8)}01`;
  return { inicio, fim };
}

// Pagos, pela data em que o dinheiro entrou/saiu (o que o contador quer pro regime de caixa).
async function pagos(tipo, inicio, fim) {
  return Lancamento.findAll({
    where: { status: 'pago', dataPagamento: { [Op.between]: [inicio, fim] }, ...(tipo ? { tipo } : {}) },
    include: INCLUDES,
    order: [['dataPagamento', 'ASC'], ['id', 'ASC']],
  });
}

function descricaoVariacao(variacao) {
  return [variacao.produto?.descricao, variacao.cor?.descricao, variacao.tamanho?.descricao].filter(Boolean).join(' · ');
}

const INCLUDES_VARIACAO = [
  { model: Produto, as: 'produto', attributes: ['descricao', 'controlaEstoque'] },
  { model: Cor, as: 'cor', attributes: ['descricao'] },
  { model: Tamanho, as: 'tamanho', attributes: ['descricao'] },
];

const RELATORIOS = {
  // Foto de hoje do estoque, valorizado pelo custo (inventário de fim de ano pro contador).
  estoque: {
    nome: 'estoque-valorizado',
    async gerar() {
      const variacoes = await ProdutoVariacao.findAll({ where: { ativo: true }, include: INCLUDES_VARIACAO, order: [[{ model: Produto, as: 'produto' }, 'descricao', 'ASC'], ['id', 'ASC']] });
      const linhas = variacoes.filter((variacao) => variacao.produto?.controlaEstoque !== false);
      return gerarCsv(
        [
          { titulo: 'Código', valor: (linha) => linha.codigo },
          { titulo: 'Produto', valor: (linha) => descricaoVariacao(linha) },
          { titulo: 'Quantidade', valor: (linha) => linha.quantidadeEstoque },
          { titulo: 'Custo unitário', valor: (linha) => linha.valorCusto, tipo: 'numero' },
          { titulo: 'Valor em estoque (custo)', valor: (linha) => Math.max(0, linha.quantidadeEstoque) * Number(linha.valorCusto), tipo: 'numero' },
          { titulo: 'Preço de venda', valor: (linha) => linha.valorVenda, tipo: 'numero' },
          { titulo: 'Valor em estoque (venda)', valor: (linha) => Math.max(0, linha.quantidadeEstoque) * Number(linha.valorVenda), tipo: 'numero' },
        ],
        linhas
      );
    },
  },

  // Vendido no período por produto (saídas de venda), com receita, custo e margem.
  'vendas-produtos': {
    nome: 'vendas-por-produto',
    async gerar({ inicio, fim }) {
      const saidas = await EstoqueMovimentacao.findAll({
        where: { tipoMovimentacao: 'S', pedidoItemId: { [Op.ne]: null }, dataMovimentacao: { [Op.between]: [new Date(`${inicio}T00:00:00-03:00`), new Date(`${fim}T23:59:59.999-03:00`)] } },
        include: [
          { model: ProdutoVariacao, as: 'produtoVariacao', include: INCLUDES_VARIACAO },
          { model: PedidoItem, as: 'pedidoItem', attributes: ['valorTotal', 'quantidade'] },
        ],
      });
      const porVariacao = new Map();
      for (const saida of saidas) {
        const linha = porVariacao.get(saida.produtoVariacaoId) || { variacao: saida.produtoVariacao, quantidade: 0, receita: 0 };
        linha.quantidade += saida.quantidade;
        linha.receita += Number(saida.pedidoItem?.valorTotal || 0);
        porVariacao.set(saida.produtoVariacaoId, linha);
      }
      const linhas = [...porVariacao.values()].sort((a, b) => b.receita - a.receita);
      return gerarCsv(
        [
          { titulo: 'Código', valor: (linha) => linha.variacao?.codigo },
          { titulo: 'Produto', valor: (linha) => descricaoVariacao(linha.variacao || {}) },
          { titulo: 'Quantidade vendida', valor: (linha) => linha.quantidade },
          { titulo: 'Receita', valor: (linha) => linha.receita, tipo: 'numero' },
          { titulo: 'Custo (atual)', valor: (linha) => linha.quantidade * Number(linha.variacao?.valorCusto || 0), tipo: 'numero' },
          { titulo: 'Margem', valor: (linha) => linha.receita - linha.quantidade * Number(linha.variacao?.valorCusto || 0), tipo: 'numero' },
        ],
        linhas
      );
    },
  },

  recebimentos: {
    nome: 'recebimentos',
    async gerar({ inicio, fim }) {
      return gerarCsv(COLUNAS_LANCAMENTO, await pagos('receita', inicio, fim));
    },
  },

  despesas: {
    nome: 'despesas-pagas',
    async gerar({ inicio, fim }) {
      return gerarCsv(COLUNAS_LANCAMENTO, await pagos('despesa', inicio, fim));
    },
  },

  // Tudo que vence ou foi pago no período (inclui em aberto e cancelado), pra conferência.
  lancamentos: {
    nome: 'lancamentos',
    async gerar({ inicio, fim }) {
      const linhas = await Lancamento.findAll({
        where: { [Op.or]: [{ vencimento: { [Op.between]: [inicio, fim] } }, { dataPagamento: { [Op.between]: [inicio, fim] } }] },
        include: INCLUDES,
        order: [['vencimento', 'ASC'], ['id', 'ASC']],
      });
      return gerarCsv(COLUNAS_LANCAMENTO, linhas);
    },
  },

  'por-categoria': {
    nome: 'resumo-por-categoria',
    async gerar({ inicio, fim }) {
      const { porCategoria } = await financeiroService.fluxoDeCaixa({ inicio, fim });
      const linhas = porCategoria.sort((a, b) => a.tipo.localeCompare(b.tipo) || b.total - a.total);
      return gerarCsv(
        [
          { titulo: 'Tipo', valor: (linha) => (linha.tipo === 'receita' ? 'Receita' : 'Despesa') },
          { titulo: 'Categoria', valor: (linha) => linha.categoria },
          { titulo: 'Total pago no período', valor: (linha) => linha.total, tipo: 'numero' },
        ],
        linhas
      );
    },
  },

  mensalidades: {
    nome: 'mensalidades',
    async gerar({ inicio, fim }) {
      const linhas = await Mensalidade.findAll({
        where: { vencimento: { [Op.between]: [inicio, fim] } },
        include: [
          { model: Aluno, as: 'aluno', attributes: ['nome'], include: { model: Responsavel, as: 'responsavel', attributes: ['nome', 'cpf'] } },
          { model: Contrato, as: 'contrato', attributes: ['id'], include: { model: Plano, as: 'plano', attributes: ['nome'] } },
        ],
        order: [['vencimento', 'ASC'], ['id', 'ASC']],
      });
      return gerarCsv(
        [
          { titulo: 'Aluno', valor: (linha) => linha.aluno?.nome },
          { titulo: 'Responsável', valor: (linha) => linha.aluno?.responsavel?.nome || '' },
          { titulo: 'CPF do responsável', valor: (linha) => linha.aluno?.responsavel?.cpf || '' },
          { titulo: 'Plano', valor: (linha) => linha.contrato?.plano?.nome || '' },
          { titulo: 'Competência', valor: (linha) => `${linha.competencia.slice(5)}/${linha.competencia.slice(0, 4)}` },
          { titulo: 'Vencimento', valor: (linha) => linha.vencimento, tipo: 'data' },
          { titulo: 'Valor', valor: (linha) => linha.valor, tipo: 'numero' },
          { titulo: 'Situação', valor: (linha) => STATUS[linha.status] || linha.status },
          { titulo: 'Pago em', valor: (linha) => linha.pagoEm, tipo: 'data' },
          { titulo: 'Valor pago', valor: (linha) => linha.valorPago, tipo: 'numero' },
          { titulo: 'Forma', valor: (linha) => FORMAS[linha.formaPagamento] || linha.formaPagamento || '' },
        ],
        linhas
      );
    },
  },

  // Foto de hoje (ignora o período): todas as mensalidades vencidas e em aberto, com o valor do dia.
  inadimplencia: {
    nome: 'inadimplencia',
    async gerar() {
      const dataHoje = hoje();
      const vencidas = await Mensalidade.findAll({
        where: { status: 'pendente', vencimento: { [Op.lt]: dataHoje } },
        include: { model: Aluno, as: 'aluno', attributes: ['nome', 'telefone'], include: { model: Responsavel, as: 'responsavel', attributes: ['nome', 'telefone'] } },
        order: [['vencimento', 'ASC']],
      });
      const linhas = await Promise.all(vencidas.map(async (mensalidade) => ({ mensalidade, atualizado: await valorAtualizado(mensalidade) })));
      return gerarCsv(
        [
          { titulo: 'Aluno', valor: ({ mensalidade }) => mensalidade.aluno?.nome },
          { titulo: 'Responsável', valor: ({ mensalidade }) => mensalidade.aluno?.responsavel?.nome || '' },
          { titulo: 'Telefone', valor: ({ mensalidade }) => mensalidade.aluno?.responsavel?.telefone || mensalidade.aluno?.telefone || '' },
          { titulo: 'Competência', valor: ({ mensalidade }) => `${mensalidade.competencia.slice(5)}/${mensalidade.competencia.slice(0, 4)}` },
          { titulo: 'Vencimento', valor: ({ mensalidade }) => mensalidade.vencimento, tipo: 'data' },
          { titulo: 'Dias de atraso', valor: ({ atualizado }) => atualizado.diasAtraso },
          { titulo: 'Valor original', valor: ({ atualizado }) => atualizado.valor, tipo: 'numero' },
          { titulo: 'Multa', valor: ({ atualizado }) => atualizado.multa, tipo: 'numero' },
          { titulo: 'Juros', valor: ({ atualizado }) => atualizado.juros, tipo: 'numero' },
          { titulo: 'Valor atualizado', valor: ({ atualizado }) => atualizado.total, tipo: 'numero' },
        ],
        linhas
      );
    },
  },
};

async function baixar(req, res) {
  const relatorio = RELATORIOS[req.params.tipo];
  if (!relatorio) return res.status(404).json({ error: 'Relatório não encontrado.' });

  const { inicio, fim } = periodo(req);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim) || inicio > fim) {
    return res.status(400).json({ error: 'Período inválido.' });
  }

  await financeiroService.sincronizarOrigens();
  const csv = await relatorio.gerar({ inicio, fim });
  const sufixo = ['inadimplencia', 'estoque'].includes(req.params.tipo) ? hoje() : `${inicio}_a_${fim}`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="sanryu-${relatorio.nome}-${sufixo}.csv"`);
  res.send(csv);
}

module.exports = { baixar, RELATORIOS };
