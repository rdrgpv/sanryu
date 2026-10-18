const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize, Pedido, PedidoItem, Produto, ProdutoVariacao, Cor, Tamanho, Lancamento, Banco } = require('../models');
const pedidoService = require('./pedidoService');
const estoqueService = require('./estoqueService');
const mercadoPagoService = require('./mercadoPagoService');
const pixService = require('./pixService');
const emailService = require('./emailService');
const configService = require('./configService');
const { hoje } = require('./mensalidadeService');
const { logErro } = require('../utils/logger');

const PREFIXO_REFERENCIA = 'PED';
const PRAZO_PAGAMENTO_HORAS = 48;

function descricao(variacao) {
  return [variacao.cor?.descricao, variacao.tamanho?.descricao].filter(Boolean).join(' · ');
}

// Vitrine: produtos marcados pra loja, com as variações que dá pra comprar agora.
async function produtosDaLoja() {
  const produtos = await Produto.findAll({
    where: { ativo: true, vendaOnline: true },
    include: { model: ProdutoVariacao, as: 'variacoes', where: { ativo: true }, required: true, include: [{ model: Cor, as: 'cor' }, { model: Tamanho, as: 'tamanho' }] },
    order: [['descricao', 'ASC']],
  });

  const todas = produtos.flatMap((produto) => produto.variacoes);
  const comSaldo = new Map((await estoqueService.anexarSaldos(todas)).map((variacao) => [variacao.id, variacao]));

  return produtos
    .map((produto) => ({
      id: produto.id,
      descricao: produto.descricao,
      foto: produto.foto,
      variacoes: produto.variacoes
        .map((variacao) => {
          const saldo = comSaldo.get(variacao.id);
          return {
            id: variacao.id,
            descricao: descricao(variacao) || 'Único',
            valor: Number(variacao.valorVenda),
            disponivel: produto.controlaEstoque === false ? null : Math.max(0, saldo.saldoDisponivel),
          };
        })
        .filter((variacao) => variacao.disponivel === null || variacao.disponivel > 0),
    }))
    .filter((produto) => produto.variacoes.length > 0);
}

async function criarPedido({ email, nome, telefone, itens }) {
  const validos = (itens || []).filter((item) => Number.isInteger(Number(item.quantidade)) && Number(item.quantidade) > 0);
  if (!validos.length) {
    const erro = new Error('Escolha pelo menos um produto.');
    erro.status = 400;
    throw erro;
  }

  return sequelize.transaction(async (transaction) => {
    const variacoes = await ProdutoVariacao.findAll({
      where: { id: validos.map((item) => item.produtoVariacaoId), ativo: true },
      include: { model: Produto, as: 'produto', where: { ativo: true, vendaOnline: true } },
      transaction,
    });
    if (variacoes.length !== new Set(validos.map((item) => Number(item.produtoVariacaoId))).size) {
      const erro = new Error('Algum produto não está mais disponível na loja.');
      erro.status = 400;
      throw erro;
    }

    const faltas = await estoqueService.faltasParaVenda(validos, { transaction });
    if (faltas.length) {
      const erro = new Error(estoqueService.mensagemFaltas(faltas));
      erro.status = 400;
      throw erro;
    }

    const pedido = await Pedido.create(
      {
        nomeCliente: nome || email,
        emailCliente: email,
        telefoneCliente: telefone || null,
        dataPedido: new Date(),
        situacao: 'P',
        canal: 'loja',
        tokenPagamento: crypto.randomBytes(24).toString('hex'),
        observacao: 'Loja da área do aluno — retirada na academia.',
      },
      { transaction }
    );

    const preco = new Map(variacoes.map((variacao) => [variacao.id, Number(variacao.valorVenda)]));
    const criados = await pedidoService.salvarItens(
      pedido,
      validos.map((item) => {
        const unitario = preco.get(Number(item.produtoVariacaoId));
        return { produtoVariacaoId: Number(item.produtoVariacaoId), quantidade: Number(item.quantidade), valorUnitario: unitario, valorTotal: Math.round(unitario * Number(item.quantidade) * 100) / 100 };
      }),
      transaction
    );
    await pedidoService.recalcularTotais(pedido, criados, transaction);
    return pedido;
  });
}

function prazoDePagamento(pedido) {
  return new Date(new Date(pedido.createdAt).getTime() + PRAZO_PAGAMENTO_HORAS * 60 * 60 * 1000);
}

// Situação do pedido da loja pro cliente: aguardando pagamento → pago (retirar) → entregue.
async function situacao(pedido) {
  if (pedido.situacao === 'E') return 'cancelado';
  if (pedido.situacao === 'F') return 'entregue';
  const lancamento = await Lancamento.findOne({ where: { origem: 'pedido', origemId: pedido.id }, attributes: ['status'] });
  return lancamento?.status === 'pago' ? 'pago' : 'aguardando';
}

// Pix válido até o fim do prazo do pedido; reaproveita o atual se ainda vale.
async function obterPix(pedido) {
  const prazo = prazoDePagamento(pedido);
  if (pedido.pixCopiaCola && pedido.pixExpiraEm && new Date(pedido.pixExpiraEm) > new Date()) return pedido;

  const minimo = new Date(Date.now() + 60 * 60 * 1000);
  const dataExpiracao = prazo > minimo ? prazo : minimo;
  const pagamentoMp = await mercadoPagoService
    .criarPagamentoPix({ valor: Number(pedido.valorTotal), descricao: `Loja San·Ryu — pedido #${pedido.id}`, email: pedido.emailCliente, referenciaExterna: `${PREFIXO_REFERENCIA}${pedido.id}`, dataExpiracao })
    .catch((err) => {
      logErro('Erro ao criar Pix do pedido da loja no Mercado Pago, caindo para QR estático:', err);
      return null;
    });

  if (pagamentoMp) {
    return pedido.update({ mpPaymentId: pagamentoMp.paymentId, qrcodePix: pagamentoMp.qrcodeBase64, pixCopiaCola: pagamentoMp.pixCopiaCola, pixExpiraEm: dataExpiracao });
  }

  const banco = await Banco.findOne({ order: [['id', 'ASC']] });
  if (!banco) return pedido;
  const pixCopiaCola = pixService.gerarPayload({ chavePix: banco.chavePix, nomeRecebedor: banco.titular, cidade: banco.cidade, valor: Number(pedido.valorTotal), txid: `${PREFIXO_REFERENCIA}${pedido.id}${Date.now()}`.slice(0, 25) });
  return pedido.update({ mpPaymentId: null, qrcodePix: await pixService.gerarQrCodeBase64(pixCopiaCola), pixCopiaCola, pixExpiraEm: dataExpiracao });
}

// Pagamento confirmado pelo Mercado Pago (webhook/conferência): dá baixa na conta a receber da venda
// e avisa o cliente pra retirar. Idempotente.
async function confirmarPagamento(pedidoId, { valor, aprovadoEm }) {
  const financeiroService = require('./financeiroService');
  const pedido = await Pedido.findByPk(pedidoId, { include: { model: PedidoItem, as: 'itens', include: { model: ProdutoVariacao, as: 'produtoVariacao', include: [{ model: Produto, as: 'produto' }, 'cor', 'tamanho'] } } });
  if (!pedido || pedido.situacao === 'E') return false;

  await financeiroService.sincronizarOrigens();
  const lancamento = await Lancamento.findOne({ where: { origem: 'pedido', origemId: pedido.id } });
  if (!lancamento || lancamento.status !== 'pendente') return false;

  const data = aprovadoEm ? new Date(aprovadoEm).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }) : hoje();
  await financeiroService.baixar(lancamento, { dataPagamento: data, valorPago: valor ?? Number(pedido.valorTotal), formaPagamento: 'pix' });

  if (pedido.emailCliente) {
    emailService
      .enviarPedidoLojaPago({
        destinatario: pedido.emailCliente,
        nome: pedido.nomeCliente,
        pedidoId: pedido.id,
        itens: pedido.itens.map((item) => `${item.quantidade}× ${[item.produtoVariacao?.produto?.descricao, descricao(item.produtoVariacao || {})].filter(Boolean).join(' ')}`),
        total: Number(pedido.valorTotal),
      })
      .catch(() => {});
  }
  return true;
}

// Reserva pro webhook: confere no MP os Pix dos pedidos da loja ainda aguardando pagamento.
async function conferirPagamentos() {
  const { processarPagamentoMercadoPago } = require('./mensalidadeService');
  const pedidos = await Pedido.findAll({ where: { canal: 'loja', situacao: 'P', mpPaymentId: { [Op.ne]: null } } });
  for (const pedido of pedidos) {
    if ((await situacao(pedido)) !== 'aguardando') continue;
    await processarPagamentoMercadoPago(pedido.mpPaymentId).catch((err) => logErro(`Erro ao conferir Pix do pedido ${pedido.id}:`, err));
  }
}

// Rotina horária: pedido da loja não pago no prazo é cancelado (libera o estoque reservado).
async function cancelarNaoPagos() {
  await conferirPagamentos();

  const limite = new Date(Date.now() - PRAZO_PAGAMENTO_HORAS * 60 * 60 * 1000);
  const pedidos = await Pedido.findAll({ where: { canal: 'loja', situacao: 'P', createdAt: { [Op.lt]: limite } } });
  let cancelados = 0;

  for (const pedido of pedidos) {
    if ((await situacao(pedido)) !== 'aguardando') continue;
    if (pedido.mpPaymentId) mercadoPagoService.cancelarPagamento(pedido.mpPaymentId).catch(() => {});
    await pedido.update({ situacao: 'E', observacao: `${pedido.observacao || ''} Cancelado: não pago em ${PRAZO_PAGAMENTO_HORAS}h.`.trim() });
    cancelados += 1;
  }

  return cancelados;
}

async function urlPagamento(pedido) {
  const base = ((await configService.obterValor('SITE_URL')) || '').replace(/\/+$/, '');
  return `${base}/loja/pedidos/${pedido.tokenPagamento}`;
}

module.exports = { PREFIXO_REFERENCIA, PRAZO_PAGAMENTO_HORAS, produtosDaLoja, criarPedido, situacao, obterPix, confirmarPagamento, cancelarNaoPagos, urlPagamento, prazoDePagamento };
