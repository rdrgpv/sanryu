const { Op } = require('sequelize');
const { Lead, Turma, Unidade } = require('../models');
const emailService = require('./emailService');
const { hoje } = require('./mensalidadeService');
const { logErro } = require('../utils/logger');

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const DIAS_A_FRENTE = 14;

// Mesmo critério da chamada: "Segunda,Quarta" / "seg, qua" -> ['seg', 'qua'].
function diasDaTurma(turma) {
  return (turma.diaSemana || '')
    .split(/[,;/]/)
    .map((dia) => dia.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().slice(0, 3))
    .filter(Boolean);
}

function somarDias(data, dias) {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

function horaAgoraBrasil() {
  return new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false });
}

// Próximos dias de aula da turma nos próximos DIAS_A_FRENTE dias. Hoje só entra se a aula ainda
// não começou.
function proximasDatas(turma, dataHoje = hoje()) {
  const dias = diasDaTurma(turma);
  const datas = [];
  for (let deslocamento = 0; deslocamento <= DIAS_A_FRENTE; deslocamento += 1) {
    const data = somarDias(dataHoje, deslocamento);
    const diaSemana = DIAS[new Date(`${data}T12:00:00Z`).getUTCDay()];
    if (!dias.includes(diaSemana)) continue;
    if (deslocamento === 0 && (turma.horaInicio || '') <= horaAgoraBrasil()) continue;
    datas.push(data);
  }
  return datas;
}

function formatarData(data) {
  const [ano, mes, dia] = data.split('-');
  const semana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][new Date(`${data}T12:00:00Z`).getUTCDay()];
  return `${semana}, ${dia}/${mes}/${ano}`;
}

async function enviarEmailAula(lead, tipo) {
  if (!lead.email || !lead.dataAula) return false;
  const turma = lead.turma || (await Turma.findByPk(lead.turmaId, { include: { model: Unidade, as: 'unidade' } }));
  return emailService.enviarAulaExperimental({
    tipo,
    destinatario: lead.email,
    nome: lead.nomeResponsavel || lead.nome,
    aluno: lead.nome,
    turma: turma?.nome || 'Aula experimental',
    data: formatarData(lead.dataAula),
    horario: turma ? `${turma.horaInicio}–${turma.horaFim}` : '',
    endereco: turma?.unidade?.endereco || turma?.unidade?.nome || '',
  });
}

// Lembrete na véspera (roda junto da rotina de hora em hora). Uma vez por agendamento.
async function enviarLembretes(dataReferencia = hoje()) {
  const amanha = somarDias(dataReferencia, 1);
  const leads = await Lead.findAll({
    where: { status: 'agendado', dataAula: amanha, email: { [Op.ne]: null }, lembreteEnviadoEm: null },
    include: { model: Turma, as: 'turma', include: { model: Unidade, as: 'unidade' } },
  });
  let enviados = 0;

  for (const lead of leads) {
    try {
      if (await enviarEmailAula(lead, 'lembrete')) {
        await lead.update({ lembreteEnviadoEm: new Date() });
        enviados += 1;
      }
    } catch (err) {
      logErro(`Erro ao enviar lembrete de aula experimental (lead ${lead.id}):`, err);
    }
  }

  return enviados;
}

module.exports = { proximasDatas, enviarEmailAula, enviarLembretes, formatarData };
