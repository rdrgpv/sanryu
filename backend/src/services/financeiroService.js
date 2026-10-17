const { Op } = require('sequelize');
const {
  Lancamento,
  CategoriaFinanceira,
  ContaFinanceira,
  Recorrencia,
  Transferencia,
  Mensalidade,
  Aluno,
  Pedido,
  PedidoCompra,
  Fornecedor,
} = require('../models');
const { hoje } = require('./mensalidadeService');
const { obterConfiguracao } = require('./contratoService');
const { logErro } = require('../utils/logger');

const FUSO = 'America/Sao_Paulo';

const CATEGORIAS_PADRAO = [
  { chave: 'mensalidades', nome: 'Mensalidades', tipo: 'receita' },
  { chave: 'vendas_loja', nome: 'Vendas da loja', tipo: 'receita' },
  { chave: 'eventos', nome: 'Eventos', tipo: 'receita' },
  { chave: 'outras_receitas', nome: 'Outras receitas', tipo: 'receita' },
  { chave: 'compras_estoque', nome: 'Compras de estoque (fornecedores)', tipo: 'despesa' },
  { chave: 'aluguel', nome: 'Aluguel', tipo: 'despesa' },
  { chave: 'salarios', nome: 'Salários e pró-labore', tipo: 'despesa' },
  { chave: 'energia', nome: 'Energia', tipo: 'despesa' },
  { chave: 'agua', nome: 'Água', tipo: 'despesa' },
  { chave: 'internet', nome: 'Internet e telefone', tipo: 'despesa' },
  { chave: 'material', nome: 'Material e equipamentos', tipo: 'despesa' },
  { chave: 'impostos', nome: 'Impostos e taxas', tipo: 'despesa' },
  { chave: 'tarifas', nome: 'Tarifas bancárias e de pagamento', tipo: 'despesa' },
  { chave: 'marketing', nome: 'Marketing', tipo: 'despesa' },
  { chave: 'outras_despesas', nome: 'Outras despesas', tipo: 'despesa' },
];

function dataBrasil(valor) {
  return valor ? new Date(valor).toLocaleDateString('sv-SE', { timeZone: FUSO }) : null;
}

function somarDias(data, dias) {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

function proximoMes(competencia) {
  const [ano, mes] = competencia.split('-').map(Number);
  return new Date(Date.UTC(ano, mes, 1)).toISOString().slice(0, 7);
}

async function garantirCategoriasPadrao() {
  for (const categoria of CATEGORIAS_PADRAO) {
    await CategoriaFinanceira.findOrCreate({ where: { chave: categoria.chave }, defaults: categoria });
  }
}

async function categoriaId(chave) {
  const categoria = await CategoriaFinanceira.findOne({ where: { chave }, attributes: ['id'] });
  return categoria?.id || null;
}

// Conta que recebe por padrão aquela forma de pagamento (ver ContaFinanceira.formasPadrao).
async function contaPadraoPara(forma) {
  if (!forma) return null;
  const contas = await ContaFinanceira.findAll({ where: { ativo: true }, attributes: ['id', 'formasPadrao'], order: [['id', 'ASC']] });
  const conta = contas.find((item) => (item.formasPadrao || '').split(',').map((f) => f.trim()).includes(forma));
  return conta?.id || null;
}

// Lançamentos já existentes de uma origem, por id de origem — uma consulta só por sincronização.
async function existentesDaOrigem(origem) {
  const lancamentos = await Lancamento.findAll({ where: { origem } });
  return new Map(lancamentos.map((lancamento) => [lancamento.origemId, lancamento]));
}

// Cria ou atualiza o lançamento automático de uma origem. "campos" sempre vale (valor, descrição...);
// "soNaCriacao" só no primeiro (vencimento/categoria/conta que o admin pode ter ajustado depois).
async function upsertOrigem(origem, origemId, campos, soNaCriacao, existente) {
  if (existente) {
    const mudou = Object.entries(campos).some(([campo, valor]) => String(existente[campo] ?? '') !== String(valor ?? ''));
    return mudou ? existente.update(campos) : existente;
  }
  return Lancamento.create({ origem, origemId, ...soNaCriacao, ...campos });
}

// ---- Origens automáticas ----

// Mensalidade paga vira receita realizada; se deixar de estar paga (reaberta), o lançamento sai.
// As em aberto não viram lançamento: aparecem direto (virtuais) em "a receber" (ver aReceber).
async function sincronizarMensalidades() {
  const categoria = await categoriaId('mensalidades');
  const pagas = await Mensalidade.findAll({
    where: { status: 'pago', valorPago: { [Op.gt]: 0 } },
    include: { model: Aluno, as: 'aluno', attributes: ['nome', 'unidadeId'] },
  });

  const existentes = await existentesDaOrigem('mensalidade');

  for (const mensalidade of pagas) {
    const dataPagamento = dataBrasil(mensalidade.pagoEm) || mensalidade.vencimento;
    await upsertOrigem(
      'mensalidade',
      mensalidade.id,
      {
        tipo: 'receita',
        descricao: `Mensalidade ${mensalidade.competencia} — ${mensalidade.aluno?.nome || 'aluno'}`,
        valor: mensalidade.valorPago,
        valorPago: mensalidade.valorPago,
        vencimento: mensalidade.vencimento,
        status: 'pago',
        dataPagamento,
        formaPagamento: mensalidade.formaPagamento,
        unidadeId: mensalidade.aluno?.unidadeId || null,
      },
      existentes.has(mensalidade.id) ? {} : { categoriaId: categoria, contaFinanceiraId: await contaPadraoPara(mensalidade.formaPagamento) },
      existentes.get(mensalidade.id)
    );
  }

  const idsPagas = pagas.map((mensalidade) => mensalidade.id);
  await Lancamento.destroy({ where: { origem: 'mensalidade', ...(idsPagas.length ? { origemId: { [Op.notIn]: idsPagas } } : {}) } });
}

// Venda da loja: vira conta a receber; o recebimento é dado no financeiro. Cancelada (E) cancela a
// cobrança em aberto (se já tinha recebido, mantém — a devolução é lançada à parte).
async function sincronizarPedidos() {
  const categoria = await categoriaId('vendas_loja');
  const pedidos = await Pedido.findAll({ attributes: ['id', 'nomeCliente', 'situacao', 'valorTotal', 'dataPedido'] });

  const existentes = await existentesDaOrigem('pedido');

  for (const pedido of pedidos) {
    const existente = existentes.get(pedido.id);

    if (pedido.situacao === 'E' || !(Number(pedido.valorTotal) > 0)) {
      if (existente?.status === 'pendente') await existente.update({ status: 'cancelado' });
      continue;
    }

    if (existente && existente.status !== 'pendente') continue;

    await upsertOrigem(
      'pedido',
      pedido.id,
      { tipo: 'receita', descricao: `Venda loja #${pedido.id} — ${pedido.nomeCliente}`, valor: pedido.valorTotal, status: 'pendente' },
      { categoriaId: categoria, vencimento: dataBrasil(pedido.dataPedido) || hoje() },
      existente
    );
  }

  const ids = pedidos.map((pedido) => pedido.id);
  await Lancamento.destroy({ where: { origem: 'pedido', status: 'pendente', ...(ids.length ? { origemId: { [Op.notIn]: ids } } : {}) } });
}

// Pedido de compra a fornecedor: vira conta a pagar; fica paga quando o pedido tem data de
// pagamento (marcado como pago lá, ou baixado aqui — ver baixar). Cancelado (E) cancela.
async function sincronizarPedidosCompra() {
  const categoria = await categoriaId('compras_estoque');
  const compras = await PedidoCompra.findAll({
    attributes: ['id', 'fornecedorId', 'situacao', 'valorTotal', 'dataPedido', 'dataPagamento'],
    include: { model: Fornecedor, as: 'fornecedor', attributes: ['nome'] },
  });

  const existentes = await existentesDaOrigem('pedidoCompra');

  for (const compra of compras) {
    const existente = existentes.get(compra.id);

    if (compra.situacao === 'E' || !(Number(compra.valorTotal) > 0)) {
      if (existente?.status === 'pendente') await existente.update({ status: 'cancelado' });
      continue;
    }

    const pago = Boolean(compra.dataPagamento);
    if (existente?.status === 'pago' && pago) continue;

    await upsertOrigem(
      'pedidoCompra',
      compra.id,
      {
        tipo: 'despesa',
        descricao: `Compra #${compra.id} — ${compra.fornecedor?.nome || 'fornecedor'}`,
        valor: compra.valorTotal,
        fornecedorId: compra.fornecedorId,
        status: pago ? 'pago' : 'pendente',
        ...(pago ? { dataPagamento: existente?.dataPagamento || dataBrasil(compra.dataPagamento), valorPago: existente?.valorPago || compra.valorTotal } : {}),
      },
      { categoriaId: categoria, vencimento: dataBrasil(compra.dataPedido) || hoje() },
      existente
    );
  }

  const ids = compras.map((compra) => compra.id);
  await Lancamento.destroy({ where: { origem: 'pedidoCompra', status: 'pendente', ...(ids.length ? { origemId: { [Op.notIn]: ids } } : {}) } });
}

// Recorrências: cria o lançamento de cada mês até N dias à frente (mesma antecedência das
// mensalidades). Um por mês por recorrência — se já existe (mesmo editado), não mexe.
async function gerarRecorrencias(dataReferencia = hoje()) {
  const configuracao = await obterConfiguracao();
  const limite = somarDias(dataReferencia, configuracao?.diasAntecedenciaCobranca ?? 10);
  const recorrencias = await Recorrencia.findAll({ where: { ativo: true } });
  let criados = 0;

  for (const recorrencia of recorrencias) {
    let competencia = recorrencia.dataInicio.slice(0, 7);

    for (;;) {
      const vencimento = `${competencia}-${String(recorrencia.diaVencimento).padStart(2, '0')}`;
      if (vencimento > limite || (recorrencia.dataFim && vencimento > recorrencia.dataFim)) break;

      if (vencimento >= recorrencia.dataInicio) {
        const existe = await Lancamento.count({ where: { origem: 'recorrencia', origemId: recorrencia.id, competencia } });
        if (!existe) {
          await Lancamento.create({
            origem: 'recorrencia',
            origemId: recorrencia.id,
            competencia,
            tipo: recorrencia.tipo,
            descricao: `${recorrencia.descricao} (${competencia.slice(5)}/${competencia.slice(0, 4)})`,
            categoriaId: recorrencia.categoriaId,
            unidadeId: recorrencia.unidadeId,
            fornecedorId: recorrencia.fornecedorId,
            contaFinanceiraId: recorrencia.contaFinanceiraId,
            valor: recorrencia.valor,
            vencimento,
          });
          criados += 1;
        }
      }

      competencia = proximoMes(competencia);
    }
  }

  return criados;
}

let sincronizando = null;

// Uma de cada vez: se a rotina horária e uma tela pedirem juntas, a segunda espera a primeira.
function sincronizarOrigens() {
  if (!sincronizando) {
    sincronizando = (async () => {
      try {
        await sincronizarMensalidades();
        await sincronizarPedidos();
        await sincronizarPedidosCompra();
        await gerarRecorrencias();
      } catch (err) {
        logErro('Erro ao sincronizar lançamentos automáticos do financeiro:', err);
      }
    })().finally(() => {
      sincronizando = null;
    });
  }
  return sincronizando;
}

// ---- Baixa ----

async function baixar(lancamento, { dataPagamento, valorPago, formaPagamento, contaFinanceiraId }) {
  await lancamento.update({
    status: 'pago',
    dataPagamento: dataPagamento || hoje(),
    valorPago: valorPago ?? lancamento.valor,
    formaPagamento: formaPagamento || null,
    contaFinanceiraId: contaFinanceiraId || (await contaPadraoPara(formaPagamento)) || lancamento.contaFinanceiraId,
  });

  // Pagar a compra aqui reflete no pedido de compra (que tem o próprio "marcar como pago").
  if (lancamento.origem === 'pedidoCompra') {
    const compra = await PedidoCompra.findByPk(lancamento.origemId);
    if (compra && !compra.dataPagamento) {
      await compra.update({ dataPagamento: new Date(), ...(compra.situacao === 'X' ? { situacao: 'PG' } : {}) });
    }
  }

  return lancamento;
}

// ---- Saldos e relatórios ----

async function saldosDasContas(ate = hoje()) {
  const [contas, lancamentos, transferencias] = await Promise.all([
    ContaFinanceira.findAll({ order: [['nome', 'ASC']] }),
    Lancamento.findAll({ where: { status: 'pago', dataPagamento: { [Op.lte]: ate } }, attributes: ['tipo', 'valorPago', 'valor', 'contaFinanceiraId', 'dataPagamento'] }),
    Transferencia.findAll({ where: { data: { [Op.lte]: ate } } }),
  ]);

  const saldos = contas.map((conta) => {
    const doPeriodo = (data) => data >= conta.dataSaldoInicial;
    let saldo = Number(conta.saldoInicial);

    lancamentos.forEach((lancamento) => {
      if (lancamento.contaFinanceiraId !== conta.id || !doPeriodo(lancamento.dataPagamento)) return;
      const valor = Number(lancamento.valorPago ?? lancamento.valor);
      saldo += lancamento.tipo === 'receita' ? valor : -valor;
    });

    transferencias.forEach((transferencia) => {
      if (!doPeriodo(transferencia.data)) return;
      if (transferencia.contaDestinoId === conta.id) saldo += Number(transferencia.valor);
      if (transferencia.contaOrigemId === conta.id) saldo -= Number(transferencia.valor);
    });

    return { ...conta.toJSON(), saldo: Math.round(saldo * 100) / 100 };
  });

  const semConta = lancamentos.filter((lancamento) => !lancamento.contaFinanceiraId).length;
  return { contas: saldos, lancamentosPagosSemConta: semConta };
}

// Mensalidades em aberto entram em "a receber" sem virar lançamento (são geridas na tela de
// Mensalidades) — aqui só no formato de lançamento, pra listagem/fluxo projetado.
async function mensalidadesEmAberto({ inicio, fim, unidadeId } = {}) {
  const where = { status: 'pendente' };
  if (inicio || fim) where.vencimento = { ...(inicio ? { [Op.gte]: inicio } : {}), ...(fim ? { [Op.lte]: fim } : {}) };

  const mensalidades = await Mensalidade.findAll({
    where,
    include: { model: Aluno, as: 'aluno', attributes: ['nome', 'unidadeId'], where: unidadeId ? { unidadeId } : undefined },
  });

  return mensalidades.map((mensalidade) => ({
    id: `m${mensalidade.id}`,
    virtual: true,
    tipo: 'receita',
    origem: 'mensalidade',
    origemId: mensalidade.id,
    descricao: `Mensalidade ${mensalidade.competencia} — ${mensalidade.aluno?.nome}`,
    categoria: { nome: 'Mensalidades' },
    valor: mensalidade.valor,
    vencimento: mensalidade.vencimento,
    status: 'pendente',
  }));
}

// Fluxo de caixa por mês: realizado (pagos, pela data de pagamento) e previsto (em aberto, pelo
// vencimento — inclui mensalidades). Transferências não entram: não são receita nem despesa.
async function fluxoDeCaixa({ inicio, fim, unidadeId }) {
  const filtroUnidade = unidadeId ? { unidadeId } : {};
  const [pagos, pendentes, mensalidades] = await Promise.all([
    Lancamento.findAll({
      where: { status: 'pago', dataPagamento: { [Op.between]: [inicio, fim] }, ...filtroUnidade },
      include: { model: CategoriaFinanceira, as: 'categoria', attributes: ['nome'] },
    }),
    Lancamento.findAll({ where: { status: 'pendente', vencimento: { [Op.between]: [inicio, fim] }, ...filtroUnidade } }),
    mensalidadesEmAberto({ inicio, fim, unidadeId }),
  ]);

  const meses = {};
  const mes = (chave) => (meses[chave] ||= { mes: chave, entradas: 0, saidas: 0, aReceber: 0, aPagar: 0 });

  pagos.forEach((lancamento) => {
    const valor = Number(lancamento.valorPago ?? lancamento.valor);
    if (lancamento.tipo === 'receita') mes(lancamento.dataPagamento.slice(0, 7)).entradas += valor;
    else mes(lancamento.dataPagamento.slice(0, 7)).saidas += valor;
  });
  [...pendentes, ...mensalidades].forEach((lancamento) => {
    const valor = Number(lancamento.valor);
    if (lancamento.tipo === 'receita') mes(lancamento.vencimento.slice(0, 7)).aReceber += valor;
    else mes(lancamento.vencimento.slice(0, 7)).aPagar += valor;
  });

  const porCategoria = {};
  pagos.forEach((lancamento) => {
    const chave = `${lancamento.tipo}:${lancamento.categoria?.nome || 'Sem categoria'}`;
    porCategoria[chave] = (porCategoria[chave] || 0) + Number(lancamento.valorPago ?? lancamento.valor);
  });

  const arredondar = (valor) => Math.round(valor * 100) / 100;
  return {
    meses: Object.values(meses)
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .map((linha) => ({
        mes: linha.mes,
        entradas: arredondar(linha.entradas),
        saidas: arredondar(linha.saidas),
        resultado: arredondar(linha.entradas - linha.saidas),
        aReceber: arredondar(linha.aReceber),
        aPagar: arredondar(linha.aPagar),
      })),
    porCategoria: Object.entries(porCategoria)
      .map(([chave, total]) => {
        const [tipo, nome] = chave.split(':');
        return { tipo, categoria: nome, total: arredondar(total) };
      })
      .sort((a, b) => b.total - a.total),
  };
}

module.exports = {
  CATEGORIAS_PADRAO,
  garantirCategoriasPadrao,
  sincronizarOrigens,
  gerarRecorrencias,
  baixar,
  saldosDasContas,
  mensalidadesEmAberto,
  fluxoDeCaixa,
  contaPadraoPara,
};
