const { Pedido, PedidoItem, ProdutoVariacao, Produto, Cor, Tamanho } = require('../models');
const lojaService = require('../services/lojaService');
const { alunosDoEmail } = require('./portalController');
const { logErro } = require('../utils/logger');

const INCLUDE_ITENS = {
  model: PedidoItem,
  as: 'itens',
  include: { model: ProdutoVariacao, as: 'produtoVariacao', include: [{ model: Produto, as: 'produto', attributes: ['descricao'] }, { model: Cor, as: 'cor' }, { model: Tamanho, as: 'tamanho' }] },
};

function itensResumo(pedido) {
  return pedido.itens.map((item) => ({
    quantidade: item.quantidade,
    descricao: [item.produtoVariacao?.produto?.descricao, item.produtoVariacao?.cor?.descricao, item.produtoVariacao?.tamanho?.descricao].filter(Boolean).join(' · '),
    valor: Number(item.valorTotal),
  }));
}

// ---- Área do aluno (token do portal) ----

async function vitrine(req, res) {
  res.json(await lojaService.produtosDaLoja());
}

async function comprar(req, res) {
  const { alunos, nome } = await alunosDoEmail(req.admin.email);
  if (!alunos.length) return res.status(403).json({ error: 'A loja é para alunos e responsáveis da academia.' });

  try {
    const pedido = await lojaService.criarPedido({ email: req.admin.email, nome, itens: req.body.itens });
    res.status(201).json({ id: pedido.id, total: Number(pedido.valorTotal), link: `/loja/pedidos/${pedido.tokenPagamento}` });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    logErro('Erro ao criar pedido da loja:', err);
    res.status(500).json({ error: 'Não foi possível criar o pedido.' });
  }
}

async function meusPedidos(req, res) {
  const pedidos = await Pedido.findAll({ where: { canal: 'loja', emailCliente: req.admin.email }, include: INCLUDE_ITENS, order: [['createdAt', 'DESC']], limit: 20 });
  res.json(
    await Promise.all(
      pedidos.map(async (pedido) => ({
        id: pedido.id,
        data: pedido.createdAt,
        total: Number(pedido.valorTotal),
        situacao: await lojaService.situacao(pedido),
        itens: itensResumo(pedido),
        link: `/loja/pedidos/${pedido.tokenPagamento}`,
      }))
    )
  );
}

// ---- Link público do pagamento (código secreto) ----

async function pagamentoPublico(req, res) {
  const pedido = await Pedido.findOne({ where: { tokenPagamento: req.params.token, canal: 'loja' }, include: INCLUDE_ITENS });
  if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });

  const situacao = await lojaService.situacao(pedido);
  const resposta = {
    id: pedido.id,
    situacao,
    total: Number(pedido.valorTotal),
    itens: itensResumo(pedido),
    prazo: lojaService.prazoDePagamento(pedido),
  };

  if (situacao !== 'aguardando') return res.json(resposta);

  try {
    await lojaService.obterPix(pedido);
    res.json({ ...resposta, qrcodePix: pedido.qrcodePix, pixCopiaCola: pedido.pixCopiaCola, baixaAutomatica: Boolean(pedido.mpPaymentId) });
  } catch (err) {
    logErro('Erro ao gerar Pix do pedido da loja:', err);
    res.status(500).json({ error: 'Não foi possível gerar o Pix agora.' });
  }
}

async function statusPublico(req, res) {
  const pedido = await Pedido.findOne({ where: { tokenPagamento: req.params.token, canal: 'loja' } });
  if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });
  res.json({ situacao: await lojaService.situacao(pedido) });
}

module.exports = { vitrine, comprar, meusPedidos, pagamentoPublico, statusPublico };
