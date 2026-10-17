const { Op } = require('sequelize');
const {
  sequelize,
  Lancamento,
  CategoriaFinanceira,
  ContaFinanceira,
  Recorrencia,
  Transferencia,
  Unidade,
  Fornecedor,
  PedidoCompra,
} = require('../models');
const financeiroService = require('../services/financeiroService');
const { hoje } = require('../services/mensalidadeService');

const FORMAS = ['pix', 'dinheiro', 'cartao', 'transferencia', 'boleto', 'debito_automatico', 'outro'];
// Lançamentos automáticos: o valor/descrição vêm da origem; no financeiro só se ajusta isto.
const EDITAVEIS_AUTOMATICO = ['vencimento', 'categoriaId', 'contaFinanceiraId', 'observacoes'];

const INCLUDES_LANCAMENTO = [
  { model: CategoriaFinanceira, as: 'categoria', attributes: ['id', 'nome', 'chave'] },
  { model: ContaFinanceira, as: 'conta', attributes: ['id', 'nome'] },
  { model: Unidade, as: 'unidade', attributes: ['id', 'nome'] },
  { model: Fornecedor, as: 'fornecedor', attributes: ['id', 'nome'] },
];

function vazioParaNulo(valor) {
  return valor === '' || valor === undefined ? null : valor;
}

function numeroPositivo(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? Math.round(numero * 100) / 100 : null;
}

function dataValida(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor || '');
}

// ---- Contas ----

async function listarContas(req, res) {
  await financeiroService.sincronizarOrigens();
  res.json(await financeiroService.saldosDasContas());
}

function dadosConta(body) {
  return {
    nome: (body.nome || '').trim(),
    tipo: body.tipo,
    unidadeId: vazioParaNulo(body.unidadeId),
    saldoInicial: Number(body.saldoInicial) || 0,
    dataSaldoInicial: body.dataSaldoInicial || hoje(),
    formasPadrao: (body.formasPadrao || []).filter((forma) => FORMAS.includes(forma)).join(',') || null,
    ativo: body.ativo !== false,
  };
}

// Cada forma de pagamento cai numa conta só por padrão — marcar numa conta tira das outras.
async function liberarFormas(formas, contaId) {
  if (!formas) return;
  const outras = await ContaFinanceira.findAll({ where: { id: { [Op.ne]: contaId || 0 } } });
  const lista = formas.split(',');
  for (const conta of outras) {
    const restantes = (conta.formasPadrao || '').split(',').filter((forma) => forma && !lista.includes(forma));
    if (restantes.join(',') !== (conta.formasPadrao || '')) await conta.update({ formasPadrao: restantes.join(',') || null });
  }
}

async function criarConta(req, res) {
  const dados = dadosConta(req.body);
  if (!dados.nome) return res.status(400).json({ error: 'Informe o nome da conta.' });

  try {
    const conta = await ContaFinanceira.create(dados);
    await liberarFormas(dados.formasPadrao, conta.id);
    res.status(201).json(conta);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function atualizarConta(req, res) {
  const conta = await ContaFinanceira.findByPk(req.params.id);
  if (!conta) return res.status(404).json({ error: 'Conta não encontrada.' });

  const dados = dadosConta(req.body);
  if (!dados.nome) return res.status(400).json({ error: 'Informe o nome da conta.' });

  try {
    await conta.update(dados);
    await liberarFormas(dados.formasPadrao, conta.id);
    res.json(conta);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function removerConta(req, res) {
  const conta = await ContaFinanceira.findByPk(req.params.id);
  if (!conta) return res.status(404).json({ error: 'Conta não encontrada.' });

  const [lancamentos, transferencias] = await Promise.all([
    Lancamento.count({ where: { contaFinanceiraId: conta.id } }),
    Transferencia.count({ where: { [Op.or]: [{ contaOrigemId: conta.id }, { contaDestinoId: conta.id }] } }),
  ]);

  if (lancamentos + transferencias > 0) {
    return res.status(400).json({ error: 'Esta conta tem movimentação. Desative em vez de excluir.' });
  }

  await conta.destroy();
  res.status(204).send();
}

// ---- Categorias ----

async function listarCategorias(req, res) {
  res.json(await CategoriaFinanceira.findAll({ order: [['tipo', 'DESC'], ['nome', 'ASC']] }));
}

async function criarCategoria(req, res) {
  const nome = (req.body.nome || '').trim();
  if (!nome || !['receita', 'despesa'].includes(req.body.tipo)) return res.status(400).json({ error: 'Informe nome e tipo.' });
  res.status(201).json(await CategoriaFinanceira.create({ nome, tipo: req.body.tipo }));
}

async function atualizarCategoria(req, res) {
  const categoria = await CategoriaFinanceira.findByPk(req.params.id);
  if (!categoria) return res.status(404).json({ error: 'Categoria não encontrada.' });
  // Tipo e chave das padrão não mudam (os lançamentos automáticos dependem delas).
  await categoria.update({ nome: (req.body.nome || categoria.nome).trim(), ativo: req.body.ativo !== false });
  res.json(categoria);
}

async function removerCategoria(req, res) {
  const categoria = await CategoriaFinanceira.findByPk(req.params.id);
  if (!categoria) return res.status(404).json({ error: 'Categoria não encontrada.' });
  if (categoria.chave) return res.status(400).json({ error: 'Categoria padrão do sistema: desative em vez de excluir.' });

  const usos = await Lancamento.count({ where: { categoriaId: categoria.id } });
  if (usos > 0) return res.status(400).json({ error: 'Categoria em uso. Desative em vez de excluir.' });

  await categoria.destroy();
  res.status(204).send();
}

// ---- Lançamentos (contas a pagar / a receber) ----

async function listarLancamentos(req, res) {
  await financeiroService.sincronizarOrigens();

  const { tipo, status, inicio, fim, categoriaId, contaFinanceiraId, unidadeId, busca } = req.query;
  const where = {};
  const dataHoje = hoje();
  if (tipo) where.tipo = tipo;
  if (categoriaId) where.categoriaId = categoriaId;
  if (contaFinanceiraId) where.contaFinanceiraId = contaFinanceiraId;
  if (unidadeId) where.unidadeId = unidadeId;
  if (busca) where.descricao = { [Op.like]: `%${busca}%` };

  // Pagos filtram pela data do pagamento; em aberto, pelo vencimento.
  const campoData = status === 'pago' ? 'dataPagamento' : 'vencimento';
  if (inicio || fim) where[campoData] = { ...(inicio ? { [Op.gte]: inicio } : {}), ...(fim ? { [Op.lte]: fim } : {}) };

  if (status === 'vencido') {
    where.status = 'pendente';
    where.vencimento = { ...(where.vencimento || {}), [Op.lt]: dataHoje };
  } else if (status) {
    where.status = status;
  }

  const lancamentos = await Lancamento.findAll({ where, include: INCLUDES_LANCAMENTO, order: [[campoData, 'ASC'], ['id', 'ASC']] });
  let linhas = lancamentos.map((lancamento) => lancamento.toJSON());

  // Mensalidades em aberto aparecem em "a receber" (são cobradas/baixadas na tela de Mensalidades).
  const querReceberEmAberto = tipo !== 'despesa' && (!status || status === 'pendente' || status === 'vencido') && !categoriaId && !contaFinanceiraId && !busca;
  if (querReceberEmAberto) {
    let mensalidades = await financeiroService.mensalidadesEmAberto({ inicio, fim, unidadeId });
    if (status === 'vencido') mensalidades = mensalidades.filter((linha) => linha.vencimento < dataHoje);
    linhas = [...linhas, ...mensalidades].sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  }

  res.json(linhas.map((linha) => ({ ...linha, vencido: linha.status === 'pendente' && linha.vencimento < dataHoje })));
}

// Lançamento manual. "parcelas" > 1 divide em parcelas mensais (ex.: equipamento em 3x). "pago"
// já lança como realizado (ex.: despesa paga na hora no caixa).
async function criarLancamento(req, res) {
  const { tipo, descricao, vencimento, parcelas: parcelasBrutas, pago } = req.body;
  const valor = numeroPositivo(req.body.valor);
  const parcelas = Math.min(48, Math.max(1, Number.parseInt(parcelasBrutas, 10) || 1));

  if (!['receita', 'despesa'].includes(tipo)) return res.status(400).json({ error: 'Tipo inválido.' });
  if (!(descricao || '').trim()) return res.status(400).json({ error: 'Informe a descrição.' });
  if (!valor) return res.status(400).json({ error: 'Informe um valor maior que zero.' });
  if (!dataValida(vencimento)) return res.status(400).json({ error: 'Informe o vencimento.' });
  if (pago && parcelas > 1) return res.status(400).json({ error: 'Lançamento já pago não pode ser parcelado.' });
  if (req.body.formaPagamento && !FORMAS.includes(req.body.formaPagamento)) return res.status(400).json({ error: 'Forma de pagamento inválida.' });

  const base = {
    tipo,
    categoriaId: vazioParaNulo(req.body.categoriaId),
    unidadeId: vazioParaNulo(req.body.unidadeId),
    fornecedorId: vazioParaNulo(req.body.fornecedorId),
    contaFinanceiraId: vazioParaNulo(req.body.contaFinanceiraId),
    observacoes: vazioParaNulo((req.body.observacoes || '').trim()),
    origem: 'manual',
  };

  // Centavos que sobram da divisão vão na primeira parcela, pra soma bater com o total.
  const valorParcela = Math.floor((valor / parcelas) * 100) / 100;
  const sobra = Math.round((valor - valorParcela * parcelas) * 100) / 100;
  const [ano, mes, dia] = vencimento.split('-').map(Number);

  const criados = await sequelize.transaction(async (transaction) => {
    const lista = [];
    for (let indice = 0; indice < parcelas; indice += 1) {
      // Dia 29–31 em mês curto cai no último dia do mês.
      const ultimoDia = new Date(Date.UTC(ano, mes - 1 + indice + 1, 0)).getUTCDate();
      const data = new Date(Date.UTC(ano, mes - 1 + indice, Math.min(dia, ultimoDia))).toISOString().slice(0, 10);
      lista.push(
        await Lancamento.create(
          {
            ...base,
            descricao: parcelas > 1 ? `${descricao.trim()} (${indice + 1}/${parcelas})` : descricao.trim(),
            valor: indice === 0 ? Math.round((valorParcela + sobra) * 100) / 100 : valorParcela,
            vencimento: data,
          },
          { transaction }
        )
      );
    }
    return lista;
  });

  if (pago) {
    await financeiroService.baixar(criados[0], {
      dataPagamento: req.body.dataPagamento || vencimento,
      valorPago: valor,
      formaPagamento: req.body.formaPagamento,
      contaFinanceiraId: base.contaFinanceiraId,
    });
  }

  res.status(201).json(criados);
}

async function carregarLancamento(req, res) {
  const lancamento = await Lancamento.findByPk(req.params.id);
  if (!lancamento) res.status(404).json({ error: 'Lançamento não encontrado.' });
  return lancamento;
}

async function atualizarLancamento(req, res) {
  const lancamento = await carregarLancamento(req, res);
  if (!lancamento) return;

  if (lancamento.origem === 'mensalidade') {
    return res.status(400).json({ error: 'Este lançamento vem de uma mensalidade — ajuste pela tela de Mensalidades.' });
  }

  const dados = {};
  const campos = ['manual', 'recorrencia'].includes(lancamento.origem)
    ? [...EDITAVEIS_AUTOMATICO, 'descricao', 'valor', 'unidadeId', 'fornecedorId']
    : EDITAVEIS_AUTOMATICO;

  campos.forEach((campo) => {
    if (req.body[campo] !== undefined) dados[campo] = vazioParaNulo(typeof req.body[campo] === 'string' ? req.body[campo].trim() : req.body[campo]);
  });

  if (dados.valor !== undefined && !numeroPositivo(dados.valor)) return res.status(400).json({ error: 'Informe um valor maior que zero.' });
  if (dados.vencimento !== undefined && !dataValida(dados.vencimento)) return res.status(400).json({ error: 'Vencimento inválido.' });
  if (dados.descricao !== undefined && !dados.descricao) return res.status(400).json({ error: 'Informe a descrição.' });

  await lancamento.update(dados);
  res.json(lancamento);
}

async function baixarLancamento(req, res) {
  const lancamento = await carregarLancamento(req, res);
  if (!lancamento) return;

  if (lancamento.origem === 'mensalidade') return res.status(400).json({ error: 'Mensalidades são baixadas na tela de Mensalidades.' });
  if (lancamento.status !== 'pendente') return res.status(400).json({ error: 'Este lançamento não está em aberto.' });

  const valorPago = numeroPositivo(req.body.valorPago);
  if (!valorPago) return res.status(400).json({ error: 'Informe o valor pago.' });
  if (req.body.formaPagamento && !FORMAS.includes(req.body.formaPagamento)) return res.status(400).json({ error: 'Forma de pagamento inválida.' });
  if (req.body.dataPagamento && !dataValida(req.body.dataPagamento)) return res.status(400).json({ error: 'Data de pagamento inválida.' });

  await financeiroService.baixar(lancamento, {
    dataPagamento: req.body.dataPagamento,
    valorPago,
    formaPagamento: req.body.formaPagamento,
    contaFinanceiraId: vazioParaNulo(req.body.contaFinanceiraId),
  });
  res.json(lancamento);
}

// Desfaz uma baixa lançada errado.
async function estornarLancamento(req, res) {
  const lancamento = await carregarLancamento(req, res);
  if (!lancamento) return;

  if (lancamento.origem === 'mensalidade') return res.status(400).json({ error: 'Para desfazer, reabra a mensalidade na tela de Mensalidades.' });
  if (lancamento.status !== 'pago') return res.status(400).json({ error: 'Este lançamento não está pago.' });

  await lancamento.update({ status: 'pendente', dataPagamento: null, valorPago: null, formaPagamento: null });

  if (lancamento.origem === 'pedidoCompra') {
    const compra = await PedidoCompra.findByPk(lancamento.origemId);
    if (compra?.dataPagamento) await compra.update({ dataPagamento: null, ...(compra.situacao === 'PG' ? { situacao: 'X' } : {}) });
  }

  res.json(lancamento);
}

async function cancelarLancamento(req, res) {
  const lancamento = await carregarLancamento(req, res);
  if (!lancamento) return;

  if (['mensalidade', 'pedido', 'pedidoCompra'].includes(lancamento.origem)) {
    return res.status(400).json({ error: 'Este lançamento vem de outro cadastro (venda, compra ou mensalidade) — cancele por lá.' });
  }
  if (lancamento.status !== 'pendente') return res.status(400).json({ error: 'Só dá para cancelar lançamento em aberto.' });

  await lancamento.update({ status: 'cancelado', observacoes: vazioParaNulo((req.body.motivo || '').trim()) || lancamento.observacoes });
  res.json(lancamento);
}

async function removerLancamento(req, res) {
  const lancamento = await carregarLancamento(req, res);
  if (!lancamento) return;

  if (lancamento.origem !== 'manual') return res.status(400).json({ error: 'Só lançamentos manuais podem ser excluídos.' });
  if (lancamento.status === 'pago') return res.status(400).json({ error: 'Estorne o pagamento antes de excluir.' });

  await lancamento.destroy();
  res.status(204).send();
}

// ---- Recorrências ----

async function listarRecorrencias(req, res) {
  res.json(
    await Recorrencia.findAll({
      include: [
        { model: CategoriaFinanceira, as: 'categoria', attributes: ['id', 'nome'] },
        { model: ContaFinanceira, as: 'conta', attributes: ['id', 'nome'] },
        { model: Unidade, as: 'unidade', attributes: ['id', 'nome'] },
        { model: Fornecedor, as: 'fornecedor', attributes: ['id', 'nome'] },
      ],
      order: [['ativo', 'DESC'], ['descricao', 'ASC']],
    })
  );
}

function dadosRecorrencia(body) {
  return {
    tipo: body.tipo === 'receita' ? 'receita' : 'despesa',
    descricao: (body.descricao || '').trim(),
    categoriaId: vazioParaNulo(body.categoriaId),
    unidadeId: vazioParaNulo(body.unidadeId),
    fornecedorId: vazioParaNulo(body.fornecedorId),
    contaFinanceiraId: vazioParaNulo(body.contaFinanceiraId),
    valor: numeroPositivo(body.valor),
    diaVencimento: Number(body.diaVencimento),
    dataInicio: body.dataInicio || hoje(),
    dataFim: vazioParaNulo(body.dataFim),
    ativo: body.ativo !== false,
  };
}

function validarRecorrencia(dados) {
  if (!dados.descricao) return 'Informe a descrição.';
  if (!dados.valor) return 'Informe um valor maior que zero.';
  if (!Number.isInteger(dados.diaVencimento) || dados.diaVencimento < 1 || dados.diaVencimento > 28) return 'O dia de vencimento deve ser entre 1 e 28.';
  if (dados.dataFim && dados.dataFim < dados.dataInicio) return 'O fim não pode ser antes do início.';
  return null;
}

async function salvarRecorrencia(req, res) {
  const dados = dadosRecorrencia(req.body);
  const erro = validarRecorrencia(dados);
  if (erro) return res.status(400).json({ error: erro });

  let recorrencia;
  if (req.params.id) {
    recorrencia = await Recorrencia.findByPk(req.params.id);
    if (!recorrencia) return res.status(404).json({ error: 'Recorrência não encontrada.' });
    // Mudar valor/dia vale pros próximos meses; os já gerados ficam como estão (podem ter sido ajustados).
    await recorrencia.update(dados);
  } else {
    recorrencia = await Recorrencia.create(dados);
  }

  const gerados = await financeiroService.gerarRecorrencias();
  res.status(req.params.id ? 200 : 201).json({ ...recorrencia.toJSON(), gerados });
}

async function removerRecorrencia(req, res) {
  const recorrencia = await Recorrencia.findByPk(req.params.id);
  if (!recorrencia) return res.status(404).json({ error: 'Recorrência não encontrada.' });

  // Os lançamentos já gerados ficam (são histórico/contas reais); só os em aberto futuros saem.
  await Lancamento.destroy({ where: { origem: 'recorrencia', origemId: recorrencia.id, status: 'pendente', vencimento: { [Op.gt]: hoje() } } });
  await recorrencia.destroy();
  res.status(204).send();
}

// ---- Transferências ----

async function listarTransferencias(req, res) {
  res.json(
    await Transferencia.findAll({
      include: [
        { model: ContaFinanceira, as: 'contaOrigem', attributes: ['id', 'nome'] },
        { model: ContaFinanceira, as: 'contaDestino', attributes: ['id', 'nome'] },
      ],
      order: [['data', 'DESC'], ['id', 'DESC']],
      limit: 200,
    })
  );
}

async function criarTransferencia(req, res) {
  const valor = numeroPositivo(req.body.valor);
  const { contaOrigemId, contaDestinoId, data } = req.body;

  if (!contaOrigemId || !contaDestinoId || String(contaOrigemId) === String(contaDestinoId)) {
    return res.status(400).json({ error: 'Escolha duas contas diferentes.' });
  }
  if (!valor) return res.status(400).json({ error: 'Informe um valor maior que zero.' });
  if (!dataValida(data)) return res.status(400).json({ error: 'Informe a data.' });

  res.status(201).json(await Transferencia.create({ contaOrigemId, contaDestinoId, valor, data, descricao: vazioParaNulo((req.body.descricao || '').trim()) }));
}

async function removerTransferencia(req, res) {
  await Transferencia.destroy({ where: { id: req.params.id } });
  res.status(204).send();
}

// ---- Resumo / fluxo de caixa ----

async function resumo(req, res) {
  await financeiroService.sincronizarOrigens();

  const dataHoje = hoje();
  const inicio = req.query.inicio || `${dataHoje.slice(0, 4)}-01-01`;
  const fim = req.query.fim || `${dataHoje.slice(0, 4)}-12-31`;
  const { unidadeId } = req.query;
  const filtroUnidade = unidadeId ? { unidadeId } : {};

  const [saldos, fluxo, vencidosPagar, vencidosReceber, mensalidadesVencidas] = await Promise.all([
    financeiroService.saldosDasContas(),
    financeiroService.fluxoDeCaixa({ inicio, fim, unidadeId }),
    Lancamento.sum('valor', { where: { tipo: 'despesa', status: 'pendente', vencimento: { [Op.lt]: dataHoje }, ...filtroUnidade } }),
    Lancamento.sum('valor', { where: { tipo: 'receita', status: 'pendente', vencimento: { [Op.lt]: dataHoje }, ...filtroUnidade } }),
    financeiroService.mensalidadesEmAberto({ unidadeId }),
  ]);

  const mensalidadesVencidasTotal = mensalidadesVencidas
    .filter((linha) => linha.vencimento < dataHoje)
    .reduce((total, linha) => total + Number(linha.valor), 0);

  res.json({
    inicio,
    fim,
    ...saldos,
    saldoTotal: Math.round(saldos.contas.filter((conta) => conta.ativo).reduce((total, conta) => total + conta.saldo, 0) * 100) / 100,
    vencidoAPagar: Number(vencidosPagar) || 0,
    vencidoAReceber: Math.round(((Number(vencidosReceber) || 0) + mensalidadesVencidasTotal) * 100) / 100,
    ...fluxo,
  });
}

module.exports = {
  FORMAS,
  listarContas,
  criarConta,
  atualizarConta,
  removerConta,
  listarCategorias,
  criarCategoria,
  atualizarCategoria,
  removerCategoria,
  listarLancamentos,
  criarLancamento,
  atualizarLancamento,
  baixarLancamento,
  estornarLancamento,
  cancelarLancamento,
  removerLancamento,
  listarRecorrencias,
  salvarRecorrencia,
  removerRecorrencia,
  listarTransferencias,
  criarTransferencia,
  removerTransferencia,
  resumo,
};
