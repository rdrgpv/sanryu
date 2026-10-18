const { Op } = require('sequelize');
const { sequelize, Turma, Aluno, Matricula, Presenca, Aula, Mensalidade, Faixa, Unidade, Instrutor, Lead } = require('../models');
const { perfilDo } = require('../middleware/auth');
const { hoje } = require('../services/mensalidadeService');

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

// "Segunda,Quarta" / "seg, qua" / "Terça" -> ['seg', 'qua', 'ter'] (o campo da turma é texto livre).
function diasDaTurma(turma) {
  return (turma.diaSemana || '')
    .split(/[,;/]/)
    .map((dia) =>
      dia
        .trim()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .slice(0, 3)
    )
    .filter(Boolean);
}

function diaDaSemana(data) {
  return DIAS[new Date(`${data}T12:00:00Z`).getUTCDay()];
}

// Sensei só mexe nas próprias turmas; admin e recepção em todas.
function veTodasAsTurmas(req) {
  return ['admin', 'recepcao'].includes(perfilDo(req));
}

function podeAcessar(req, turma) {
  return veTodasAsTurmas(req) || (turma.instrutorId && turma.instrutorId === req.admin.instrutorId);
}

async function carregarTurma(req, res) {
  const turma = await Turma.findByPk(req.params.turmaId, {
    include: [
      { model: Instrutor, as: 'instrutor', attributes: ['id', 'nome'] },
      { model: Unidade, as: 'unidade', attributes: ['id', 'nome'] },
    ],
  });

  if (!turma) {
    res.status(404).json({ error: 'Turma não encontrada.' });
    return null;
  }

  if (!podeAcessar(req, turma)) {
    res.status(403).json({ error: 'Esta turma não é sua.' });
    return null;
  }

  return turma;
}

function dataValida(data) {
  return /^\d{4}-\d{2}-\d{2}$/.test(data || '') && data <= hoje();
}

async function listarTurmas(req, res) {
  const where = veTodasAsTurmas(req) ? {} : { instrutorId: req.admin.instrutorId || -1 };
  const turmas = await Turma.findAll({
    where,
    include: [
      { model: Instrutor, as: 'instrutor', attributes: ['id', 'nome'] },
      { model: Unidade, as: 'unidade', attributes: ['id', 'nome'] },
    ],
    order: [['horaInicio', 'ASC']],
  });

  const dataHoje = hoje();
  const diaHoje = diaDaSemana(dataHoje);
  const feitasHoje = await Aula.findAll({ where: { data: dataHoje, turmaId: turmas.map((turma) => turma.id) }, attributes: ['turmaId'] });
  const idsFeitas = new Set(feitasHoje.map((aula) => aula.turmaId));

  res.json(
    turmas.map((turma) => ({
      ...turma.toJSON(),
      temAulaHoje: diasDaTurma(turma).includes(diaHoje),
      chamadaFeitaHoje: idsFeitas.has(turma.id),
    }))
  );
}

// Alunos da chamada: matriculados (matrícula ativa) e com situação ativa — mais quem já tem
// presença nesse dia, pra uma chamada antiga continuar aparecendo inteira mesmo se o aluno saiu.
async function buscarChamada(req, res) {
  const turma = await carregarTurma(req, res);
  if (!turma) return;

  const data = req.query.data || hoje();
  if (!dataValida(data)) {
    return res.status(400).json({ error: 'Data inválida (não dá para fazer chamada de dia futuro).' });
  }

  const [matriculas, presencas, aula] = await Promise.all([
    Matricula.findAll({ where: { turmaId: turma.id, status: 'ativa' }, attributes: ['alunoId'] }),
    Presenca.findAll({ where: { turmaId: turma.id, data }, attributes: ['alunoId'] }),
    Aula.findOne({ where: { turmaId: turma.id, data } }),
  ]);

  // Aulas experimentais agendadas pra esta turma neste dia (o sensei marca quem veio).
  const experimentais = await Lead.findAll({
    where: { turmaId: turma.id, dataAula: data, status: ['agendado', 'compareceu', 'matriculado'] },
    attributes: ['id', 'nome', 'dataNascimento', 'status', 'nomeResponsavel', 'observacoes'],
    order: [['nome', 'ASC']],
  });

  const presentes = new Set(presencas.map((presenca) => presenca.alunoId));
  const idsMatriculados = matriculas.map((matricula) => matricula.alunoId);

  const alunos = await Aluno.findAll({
    where: {
      [Op.or]: [{ id: idsMatriculados, situacao: 'ativo' }, { id: [...presentes] }],
    },
    attributes: ['id', 'nome', 'foto', 'dataNascimento', 'restricoesMedicas', 'alergias', 'consentimentoBiometria'],
    include: { model: Faixa, as: 'faixa', attributes: ['nome', 'cor'] },
    order: [['nome', 'ASC']],
  });

  // Só o aviso, sem valores: o sensei não precisa ver o financeiro.
  const emAtraso = await Mensalidade.findAll({
    where: { alunoId: alunos.map((aluno) => aluno.id), status: 'pendente', vencimento: { [Op.lt]: hoje() } },
    attributes: ['alunoId'],
    group: ['alunoId'],
  });
  const idsEmAtraso = new Set(emAtraso.map((mensalidade) => mensalidade.alunoId));

  res.json({
    turma: { id: turma.id, nome: turma.nome, horaInicio: turma.horaInicio, horaFim: turma.horaFim, unidade: turma.unidade?.nome || null },
    data,
    chamadaFeita: Boolean(aula),
    observacoes: aula?.observacoes || '',
    experimentais: experimentais.map((lead) => ({
      id: lead.id,
      nome: lead.nome,
      responsavel: lead.nomeResponsavel,
      observacoes: lead.observacoes,
      // "matriculado" já veio (e virou aluno) — conta como presente.
      presente: lead.status !== 'agendado',
      travado: lead.status === 'matriculado',
    })),
    alunos: alunos.map((aluno) => ({
      id: aluno.id,
      nome: aluno.nome,
      foto: aluno.foto,
      faixa: aluno.faixa,
      // Saúde aparece pro sensei por segurança no treino (lesão, alergia).
      atencaoSaude: [aluno.restricoesMedicas, aluno.alergias].filter(Boolean).join(' · ') || null,
      presente: presentes.has(aluno.id),
      mensalidadeEmAtraso: idsEmAtraso.has(aluno.id),
      foraDaTurma: !idsMatriculados.includes(aluno.id),
      // Só quem autorizou entra na comparação da chamada por foto (feita no celular, ver Chamada.jsx).
      reconhecimentoPermitido: Boolean(aluno.consentimentoBiometria && aluno.foto),
    })),
  });
}

async function salvarChamada(req, res) {
  const turma = await carregarTurma(req, res);
  if (!turma) return;

  const { data, observacoes } = req.body;
  const presentes = [...new Set((req.body.presentes || []).map(Number).filter(Number.isInteger))];

  if (!dataValida(data)) {
    return res.status(400).json({ error: 'Data inválida (não dá para fazer chamada de dia futuro).' });
  }

  // Só aceita aluno matriculado na turma ou que já estava presente nesse dia.
  const [matriculas, jaPresentes] = await Promise.all([
    Matricula.findAll({ where: { turmaId: turma.id }, attributes: ['alunoId'] }),
    Presenca.findAll({ where: { turmaId: turma.id, data }, attributes: ['alunoId'] }),
  ]);
  const permitidos = new Set([...matriculas, ...jaPresentes].map((item) => item.alunoId));
  const invalidos = presentes.filter((alunoId) => !permitidos.has(alunoId));

  if (invalidos.length > 0) {
    return res.status(400).json({ error: 'Há aluno na lista que não é desta turma.' });
  }

  await sequelize.transaction(async (transaction) => {
    const [aula] = await Aula.findOrCreate({
      where: { turmaId: turma.id, data },
      defaults: { registradoPorId: req.admin.id },
      transaction,
    });
    await aula.update({ observacoes: (observacoes || '').trim() || null, registradoPorId: req.admin.id }, { transaction });

    await Presenca.destroy({ where: { turmaId: turma.id, data, alunoId: { [Op.notIn]: presentes.length ? presentes : [0] } }, transaction });

    const atuais = new Set(jaPresentes.map((presenca) => presenca.alunoId));
    const novos = presentes.filter((alunoId) => !atuais.has(alunoId));
    if (novos.length > 0) {
      await Presenca.bulkCreate(
        novos.map((alunoId) => ({ alunoId, turmaId: turma.id, data, registradoPorId: req.admin.id })),
        { transaction }
      );
    }
  });

  // Experimentais: marcado = compareceu; desmarcado volta pra agendado (convertido não mexe).
  if (Array.isArray(req.body.experimentaisPresentes)) {
    const vieram = req.body.experimentaisPresentes.map(Number);
    const doDia = await Lead.findAll({ where: { turmaId: turma.id, dataAula: data, status: ['agendado', 'compareceu'] } });
    for (const lead of doDia) {
      const status = vieram.includes(lead.id) ? 'compareceu' : 'agendado';
      if (lead.status !== status) await lead.update({ status });
    }
  }

  res.json({ salvo: true, presentes: presentes.length });
}

// Relatório (admin): por aluno ativo, presenças / aulas dadas nas turmas em que está matriculado,
// no período — e a última presença de todas, pra achar quem sumiu.
async function frequencia(req, res) {
  const fim = req.query.fim || hoje();
  const inicio = req.query.inicio || `${fim.slice(0, 8)}01`;
  const { turmaId, unidadeId } = req.query;

  const matriculas = await Matricula.findAll({
    where: { status: 'ativa', ...(turmaId ? { turmaId } : {}) },
    include: {
      model: Aluno,
      as: 'aluno',
      where: { situacao: 'ativo', ...(unidadeId ? { unidadeId } : {}) },
      attributes: ['id', 'nome'],
      include: { model: Faixa, as: 'faixa', attributes: ['nome', 'cor'] },
    },
  });

  const turmaIds = [...new Set(matriculas.map((matricula) => matricula.turmaId))];
  const alunoIds = [...new Set(matriculas.map((matricula) => matricula.alunoId))];

  const [aulas, presencasPeriodo, ultimas, turmas] = await Promise.all([
    Aula.findAll({ where: { turmaId: turmaIds, data: { [Op.between]: [inicio, fim] } }, attributes: ['turmaId'] }),
    Presenca.findAll({ where: { alunoId: alunoIds, turmaId: turmaIds, data: { [Op.between]: [inicio, fim] } }, attributes: ['alunoId'] }),
    Presenca.findAll({
      where: { alunoId: alunoIds },
      attributes: ['alunoId', [sequelize.fn('MAX', sequelize.col('data')), 'ultima']],
      group: ['alunoId'],
      raw: true,
    }),
    Turma.findAll({ where: { id: turmaIds }, attributes: ['id', 'nome'] }),
  ]);

  const aulasPorTurma = {};
  aulas.forEach((aula) => {
    aulasPorTurma[aula.turmaId] = (aulasPorTurma[aula.turmaId] || 0) + 1;
  });
  const presencasPorAluno = {};
  presencasPeriodo.forEach((presenca) => {
    presencasPorAluno[presenca.alunoId] = (presencasPorAluno[presenca.alunoId] || 0) + 1;
  });
  const ultimaPorAluno = Object.fromEntries(ultimas.map((linha) => [linha.alunoId, linha.ultima]));
  const nomeTurma = Object.fromEntries(turmas.map((turma) => [turma.id, turma.nome]));

  const porAluno = {};
  matriculas.forEach((matricula) => {
    const linha = (porAluno[matricula.alunoId] ||= {
      id: matricula.aluno.id,
      nome: matricula.aluno.nome,
      faixa: matricula.aluno.faixa,
      turmas: [],
      aulas: 0,
    });
    linha.turmas.push(nomeTurma[matricula.turmaId]);
    linha.aulas += aulasPorTurma[matricula.turmaId] || 0;
  });

  const linhas = Object.values(porAluno).map((linha) => {
    const presencas = presencasPorAluno[linha.id] || 0;
    return {
      ...linha,
      presencas,
      percentual: linha.aulas > 0 ? Math.round((presencas / linha.aulas) * 100) : null,
      ultimaPresenca: ultimaPorAluno[linha.id] || null,
    };
  });

  res.json({ inicio, fim, alunos: linhas.sort((a, b) => a.nome.localeCompare(b.nome)) });
}

module.exports = { listarTurmas, buscarChamada, salvarChamada, frequencia, diasDaTurma };
