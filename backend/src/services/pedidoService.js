const { PedidoItem, PedidoItemPersonalizacao, TipoPersonalizacao, EstoqueMovimentacao } = require('../models');
const estoqueService = require('./estoqueService');

// Apaga e reinsere todos os itens/personalizações a cada save do Pedido — estratégia simples (igual
// ao sistema de referência): perde os IDs de linha entre edições, mas evita diff complexo entre o
// que já existia e o que veio no payload. Valida "exigeTexto" de cada personalização aqui (o
// sistema de referência só validava isso no cliente).
async function salvarItens(pedido, itensPayload, transaction) {
  const antigos = await PedidoItem.findAll({ where: { pedidoId: pedido.id }, attributes: ['id'], transaction });
  const idsAntigos = antigos.map((i) => i.id);
  if (idsAntigos.length) {
    await PedidoItemPersonalizacao.destroy({ where: { pedidoItemId: idsAntigos }, transaction });
    await PedidoItem.destroy({ where: { pedidoId: pedido.id }, transaction });
  }

  const criados = [];
  for (const itemPayload of itensPayload || []) {
    const item = await PedidoItem.create(
      {
        pedidoId: pedido.id,
        produtoVariacaoId: itemPayload.produtoVariacaoId,
        quantidade: itemPayload.quantidade,
        valorUnitario: itemPayload.valorUnitario,
        valorTotal: itemPayload.valorTotal,
        observacao: itemPayload.observacao || null,
      },
      { transaction }
    );

    const personalizacoesCriadas = [];
    for (const p of itemPayload.personalizacoes || []) {
      const tipo = await TipoPersonalizacao.findByPk(p.tipoPersonalizacaoId, { transaction });
      if (!tipo) throw new Error('Tipo de personalização inválido.');
      if (tipo.exigeTexto && !(p.textoPersonalizado || '').trim()) {
        throw new Error(`O tipo de personalização "${tipo.descricao}" exige um texto.`);
      }

      const pers = await PedidoItemPersonalizacao.create(
        {
          pedidoItemId: item.id,
          tipoPersonalizacaoId: p.tipoPersonalizacaoId,
          textoPersonalizado: p.textoPersonalizado || null,
          corPersonalizacao: p.corPersonalizacao || null,
          posicao: p.posicao || null,
          valor: p.valor || 0,
          observacao: p.observacao || null,
        },
        { transaction }
      );
      personalizacoesCriadas.push(pers);
    }

    criados.push({ item, personalizacoes: personalizacoesCriadas });
  }

  return criados;
}

// Nunca confia no total enviado pelo cliente — recalcula sempre a partir das linhas persistidas.
async function recalcularTotais(pedido, itensCriados, transaction) {
  const valorProdutos = itensCriados.reduce((soma, { item }) => soma + Number(item.valorTotal), 0);
  const valorPersonalizacoes = itensCriados.reduce(
    (soma, { personalizacoes }) => soma + personalizacoes.reduce((s, p) => s + Number(p.valor), 0),
    0
  );
  const valorTotal = valorProdutos + valorPersonalizacoes - Number(pedido.valorDesconto || 0);

  await pedido.update({ valorProdutos, valorPersonalizacoes, valorTotal }, { transaction });
}

async function entregar(pedido, transaction) {
  if (['F', 'E'].includes(pedido.situacao)) {
    throw new Error('Pedido já finalizado ou cancelado.');
  }

  const itens = await PedidoItem.findAll({ where: { pedidoId: pedido.id }, include: ['produtoVariacao'], transaction });

  for (const item of itens) {
    await EstoqueMovimentacao.create(
      {
        produtoVariacaoId: item.produtoVariacaoId,
        tipoMovimentacao: 'S',
        quantidade: item.quantidade,
        pedidoItemId: item.id,
        documentoOrigem: `Pedido #${pedido.id}`,
        dataMovimentacao: new Date(),
      },
      { transaction }
    );
    await estoqueService.aplicarMovimento(item.produtoVariacao, 'S', item.quantidade, transaction);
  }

  await pedido.update({ situacao: 'F', dataEntrega: new Date() }, { transaction });
}

module.exports = { salvarItens, recalcularTotais, entregar };
