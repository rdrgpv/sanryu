const { Op } = require('sequelize');
const { Aluno, Turma, Instrutor, Matricula, Faixa, Evento, TipoEvento, EventoAluno } = require('../models');

// Quantidade de alunos ativos por faixa, na ordem de graduação (Faixa.ordem) — usado pelo card
// "Distribuição de Faixas" do dashboard. Não hardcoda nomes/cores: tudo vem do cadastro de Faixa.
async function buscarDistribuicaoFaixas() {
  const faixas = await Faixa.findAll({ order: [['ordem', 'ASC']] });

  const contagens = await Aluno.findAll({
    attributes: ['faixaId', [Aluno.sequelize.fn('COUNT', Aluno.sequelize.col('id')), 'total']],
    where: { ativo: true, faixaId: { [Op.ne]: null } },
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

async function resumo(req, res) {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [alunosAtivos, totalTurmas, totalInstrutores, matriculasDoMes, distribuicaoFaixas, proximosEventos] = await Promise.all([
    Aluno.count({ where: { ativo: true } }),
    Turma.count(),
    Instrutor.count(),
    Matricula.count({ where: { dataMatricula: { [Op.gte]: inicioMes.toISOString().slice(0, 10) } } }),
    buscarDistribuicaoFaixas(),
    buscarProximosEventos(),
  ]);

  res.json({ alunosAtivos, totalTurmas, totalInstrutores, matriculasDoMes, distribuicaoFaixas, proximosEventos });
}

module.exports = { resumo };
