const { Op } = require('sequelize');
const { sequelize, Aluno, Turma, Instrutor, Faixa, Evento, TipoEvento, EventoAluno, Contrato, Mensalidade, Presenca, Matricula, Responsavel } = require('../models');
const { hoje } = require('../services/mensalidadeService');
const { perfilDo } = require('../middleware/auth');
const financeiroService = require('../services/financeiroService');
const estoqueService = require('../services/estoqueService');

const MESES_HISTORICO = 12;
const DIAS_SUMIDO = 14;

function ultimoDiaDoMes(competencia) {
  const [ano, mes] = competencia.split('-').map(Number);
  return new Date(Date.UTC(ano, mes, 0)).toISOString().slice(0, 10);
}

// Os últimos N meses ("2025-11" ... "2026-10"), terminando no mês atual.
function ultimosMeses(dataHoje, quantidade) {
  const [ano, mes] = dataHoje.split('-').map(Number);
  return Array.from({ length: quantidade }, (_, indice) =>
    new Date(Date.UTC(ano, mes - quantidade + indice, 1)).toISOString().slice(0, 7)
  );
}

function somarDias(data, dias) {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

// Quantidade de alunos ativos por faixa, na ordem de graduação (Faixa.ordem) — usado pelo card
// "Distribuição de Faixas" do dashboard. Não hardcoda nomes/cores: tudo vem do cadastro de Faixa.
async function buscarDistribuicaoFaixas() {
  const faixas = await Faixa.findAll({ order: [['ordem', 'ASC']] });

  const contagens = await Aluno.findAll({
    attributes: ['faixaId', [Aluno.sequelize.fn('COUNT', Aluno.sequelize.col('id')), 'total']],
    where: { ativo: true, vinculo: 'academia', faixaId: { [Op.ne]: null } },
    group: ['faixaId'],
    raw: true,
  });

  const totalPorFaixaId = new Map(contagens.map((linha) => [linha.faixaId, Number(linha.total)]));

  return faixas
    .map((faixa) => ({
      id: faixa.id,
      nome: faixa.nome,
      cor: faixa.cor,
      grau: faixa.grau,
      total: totalPorFaixaId.get(faixa.id) || 0,
    }))
    .filter((faixa) => faixa.total > 0);
}

// Próximos eventos agendados (a partir de agora), com o total de inscrições de cada um — usado
// pelo card "Próximos Eventos" do dashboard.
async function buscarProximosEventos() {
  const eventos = await Evento.findAll({
    where: { status: 'agendado', data: { [Op.gte]: new Date() } },
    include: [{ model: TipoEvento, as: 'tipoEvento' }],
    order: [['data', 'ASC']],
    limit: 5,
  });

  return Promise.all(
    eventos.map(async (evento) => ({
      id: evento.id,
      nome: evento.nome,
      data: evento.data,
      local: evento.local,
      tipoEvento: evento.tipoEvento ? { id: evento.tipoEvento.id, nome: evento.tipoEvento.nome } : null,
      totalInscritos: await EventoAluno.count({ where: { eventoId: evento.id } }),
    }))
  );
}

// Evolução de alunos pelos contratos (é o que tem data de entrada e de saída): ativos no fim de
// cada mês, novos (início no mês) e saídas (encerrados/cancelados com fim no mês).
async function buscarEvolucaoAlunos(meses) {
  const contratos = await Contrato.findAll({ attributes: ['alunoId', 'dataInicio', 'dataFim', 'situacao'], raw: true });

  return meses.map((competencia) => {
    const fim = ultimoDiaDoMes(competencia);
    const ativos = new Set(
      contratos.filter((contrato) => contrato.dataInicio <= fim && (!contrato.dataFim || contrato.dataFim > fim)).map((contrato) => contrato.alunoId)
    );
    return {
      mes: competencia,
      ativos: ativos.size,
      novos: contratos.filter((contrato) => contrato.dataInicio.slice(0, 7) === competencia).length,
      saidas: contratos.filter((contrato) => contrato.dataFim && contrato.situacao !== 'ativo' && contrato.dataFim.slice(0, 7) === competencia).length,
    };
  });
}

async function buscarInadimplencia(dataHoje) {
  const vencidas = await Mensalidade.findAll({
    where: { status: 'pendente', vencimento: { [Op.lt]: dataHoje } },
    include: {
      model: Aluno,
      as: 'aluno',
      attributes: ['id', 'nome', 'telefone'],
      include: { model: Responsavel, as: 'responsavel', attributes: ['nome', 'telefone'] },
    },
    order: [['vencimento', 'ASC']],
  });

  const alunosEmAtraso = new Set(vencidas.map((mensalidade) => mensalidade.alunoId));
  const diasDeAtraso = (vencimento) => Math.round((Date.parse(`${dataHoje}T00:00:00Z`) - Date.parse(`${vencimento}T00:00:00Z`)) / 86400000);

  return {
    total: Math.round(vencidas.reduce((total, mensalidade) => total + Number(mensalidade.valor), 0) * 100) / 100,
    alunos: alunosEmAtraso.size,
    maisAtrasadas: vencidas.slice(0, 6).map((mensalidade) => ({
      id: mensalidade.id,
      aluno: mensalidade.aluno?.nome,
      responsavel: mensalidade.aluno?.responsavel?.nome || null,
      competencia: mensalidade.competencia,
      valor: mensalidade.valor,
      diasAtraso: diasDeAtraso(mensalidade.vencimento),
    })),
  };
}

// Engajamento: dos alunos ativos matriculados em turma, quantos treinaram nos últimos 30 dias, e
// quem está sumido há DIAS_SUMIDO+ (ou nunca treinou) — os mais antigos primeiro.
async function buscarEngajamento(dataHoje) {
  const matriculados = await Matricula.findAll({
    where: { status: 'ativa' },
    attributes: ['alunoId'],
    include: { model: Aluno, as: 'aluno', where: { situacao: 'ativo' }, attributes: ['id', 'nome', 'createdAt'] },
  });
  const alunos = new Map(matriculados.map((matricula) => [matricula.alunoId, matricula.aluno]));

  if (alunos.size === 0) return { matriculados: 0, treinaram30Dias: 0, sumidos: [] };

  const ultimas = await Presenca.findAll({
    where: { alunoId: [...alunos.keys()] },
    attributes: ['alunoId', [sequelize.fn('MAX', sequelize.col('data')), 'ultima']],
    group: ['alunoId'],
    raw: true,
  });
  const ultimaPorAluno = new Map(ultimas.map((linha) => [linha.alunoId, linha.ultima]));
  const limite30 = somarDias(dataHoje, -30);
  const limiteSumido = somarDias(dataHoje, -DIAS_SUMIDO);

  const sumidos = [...alunos.values()]
    .map((aluno) => ({ id: aluno.id, nome: aluno.nome, ultimaPresenca: ultimaPorAluno.get(aluno.id) || null }))
    .filter((aluno) => !aluno.ultimaPresenca || aluno.ultimaPresenca < limiteSumido)
    .sort((a, b) => (a.ultimaPresenca || '').localeCompare(b.ultimaPresenca || ''));

  return {
    matriculados: alunos.size,
    treinaram30Dias: [...ultimaPorAluno.values()].filter((data) => data >= limite30).length,
    totalSumidos: sumidos.length,
    sumidos: sumidos.slice(0, 6),
  };
}

// Aniversariantes do mês entre os ativos (dia/mês lidos da string, sem fuso).
async function buscarAniversariantes(dataHoje) {
  const mes = dataHoje.slice(5, 7);
  const alunos = await Aluno.findAll({ where: { situacao: 'ativo', vinculo: 'academia', dataNascimento: { [Op.ne]: null } }, attributes: ['id', 'nome', 'dataNascimento'], raw: true });

  return alunos
    .filter((aluno) => String(aluno.dataNascimento).slice(5, 7) === mes)
    .map((aluno) => ({
      id: aluno.id,
      nome: aluno.nome,
      dia: Number(String(aluno.dataNascimento).slice(8, 10)),
      idade: Number(dataHoje.slice(0, 4)) - Number(String(aluno.dataNascimento).slice(0, 4)),
      hoje: String(aluno.dataNascimento).slice(5, 10) === dataHoje.slice(5, 10),
    }))
    .sort((a, b) => a.dia - b.dia);
}

// Variações (de produto que controla estoque) com o disponível no mínimo ou abaixo.
async function contarEstoqueBaixo() {
  const { ProdutoVariacao, Produto } = require('../models');
  const variacoes = await ProdutoVariacao.findAll({
    where: { ativo: true, estoqueMinimo: { [Op.gt]: 0 } },
    include: { model: Produto, as: 'produto', where: { ativo: true, controlaEstoque: true }, attributes: [] },
  });
  const comSaldo = await estoqueService.anexarSaldos(variacoes);
  return comSaldo.filter((variacao) => variacao.saldoDisponivel <= variacao.estoqueMinimo).length;
}

async function resumo(req, res) {
  const dataHoje = hoje();
  const meses = ultimosMeses(dataHoje, MESES_HISTORICO);
  const mesAtual = meses[meses.length - 1];

  await financeiroService.sincronizarOrigens();

  const [alunosAtivos, totalTurmas, totalInstrutores, distribuicaoFaixas, proximosEventos, evolucao, inadimplencia, engajamento, aniversariantes, fluxo] =
    await Promise.all([
      Aluno.count({ where: { situacao: 'ativo', vinculo: 'academia' } }),
      Turma.count(),
      Instrutor.count(),
      buscarDistribuicaoFaixas(),
      buscarProximosEventos(),
      buscarEvolucaoAlunos(meses),
      buscarInadimplencia(dataHoje),
      buscarEngajamento(dataHoje),
      buscarAniversariantes(dataHoje),
      financeiroService.fluxoDeCaixa({ inicio: `${meses[0]}-01`, fim: ultimoDiaDoMes(mesAtual) }),
    ]);

  // Série financeira com todos os 12 meses (os sem movimento entram zerados, pro eixo não pular mês).
  const porMes = new Map(fluxo.meses.map((linha) => [linha.mes, linha]));
  const financeiro = meses.map((competencia) => {
    const linha = porMes.get(competencia);
    return { mes: competencia, entradas: linha?.entradas || 0, saidas: linha?.saidas || 0, resultado: linha?.resultado || 0 };
  });

  const evolucaoAtual = evolucao[evolucao.length - 1];
  const financeiroAtual = financeiro[financeiro.length - 1];
  const financeiroAnterior = financeiro[financeiro.length - 2];

  // Recepção vê o operacional (alunos, atrasos pra cobrar, frequência), não o caixa da academia.
  const somenteAdmin = perfilDo(req) === 'admin'
    ? {
        estoqueBaixo: await contarEstoqueBaixo(),
        recebidoNoMes: financeiroAtual.entradas,
        recebidoMesAnterior: financeiroAnterior?.entradas || 0,
        resultadoNoMes: financeiroAtual.resultado,
        financeiro,
      }
    : {};

  res.json({
    ...somenteAdmin,
    alunosAtivos,
    totalTurmas,
    totalInstrutores,
    // Mantido por compatibilidade com o card antigo (agora = contratos iniciados no mês).
    matriculasDoMes: evolucaoAtual.novos,
    novosNoMes: evolucaoAtual.novos,
    saidasNoMes: evolucaoAtual.saidas,
    inadimplencia,
    engajamento,
    aniversariantes,
    evolucao,
    distribuicaoFaixas,
    proximosEventos,
  });
}

module.exports = { resumo };
