const { Evento, TipoEvento, EventoAluno, Instrutor, Aluno, Turma, Matricula, Faixa } = require('../models');
const { TIPO_EXAME_DE_FAIXA_ID } = require('../services/valorInscricaoService');
const mercadoPagoService = require('../services/mercadoPagoService');
const emailService = require('../services/emailService');
const gatameService = require('../services/gatameService');
const { qrExpirado, gerarPagamentoPix } = require('../services/pagamentoInscricaoService');
const { logErro } = require('../utils/logger');

// Aplica a regra de valor do item 2: só é permitido usar o campo "valor" do evento
// quando o tipo é cobrável e diferente de Exame de Faixa (cujo valor vem da faixa).
async function aplicarRegraValor(dados) {
  const tipoEvento = await TipoEvento.findByPk(dados.tipoEventoId);

  if (!tipoEvento) {
    throw new Error('Tipo de evento inválido.');
  }

  const podeUsarValorProprio = tipoEvento.cobravel && tipoEvento.id !== TIPO_EXAME_DE_FAIXA_ID;

  return { ...dados, valor: podeUsarValorProprio ? dados.valor ?? null : null };
}

async function listar(req, res) {
  const eventos = await Evento.findAll({
    include: [
      { model: TipoEvento, as: 'tipoEvento' },
      { model: Instrutor, as: 'instrutor' },
    ],
    order: [['data', 'DESC']],
  });
  res.json(eventos);
}

async function buscarPorId(req, res) {
  const evento = await Evento.findByPk(req.params.id, {
    include: [
      { model: TipoEvento, as: 'tipoEvento' },
      { model: Instrutor, as: 'instrutor' },
    ],
  });

  if (!evento) {
    return res.status(404).json({ error: 'Evento não encontrado.' });
  }

  res.json(evento);
}

async function criar(req, res) {
  try {
    const payload = await aplicarRegraValor(req.body);
    const evento = await Evento.create(payload);
    res.status(201).json(evento);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function atualizar(req, res) {
  const evento = await Evento.findByPk(req.params.id);

  if (!evento) {
    return res.status(404).json({ error: 'Evento não encontrado.' });
  }

  try {
    const payload = await aplicarRegraValor({ ...evento.toJSON(), ...req.body });
    await evento.update(payload);
    res.json(evento);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remover(req, res) {
  const evento = await Evento.findByPk(req.params.id);

  if (!evento) {
    return res.status(404).json({ error: 'Evento não encontrado.' });
  }

  await evento.destroy();
  res.status(204).send();
}

async function listarInscricoes(req, res) {
  const evento = await Evento.findByPk(req.params.id);

  if (!evento) {
    return res.status(404).json({ error: 'Evento não encontrado.' });
  }

  const inscricoes = await EventoAluno.findAll({
    where: { eventoId: evento.id },
    order: [['createdAt', 'DESC']],
  });

  res.json(inscricoes);
}

async function verificarPagamento(req, res) {
  const inscricao = await EventoAluno.findByPk(req.params.id);

  if (!inscricao) {
    return res.status(404).json({ error: 'Inscrição não encontrada.' });
  }

  if (!inscricao.mpPaymentId) {
    return res.status(400).json({ error: 'Esta inscrição não possui um pagamento via Mercado Pago associado.' });
  }

  // "cancelado" é definitivo (ação manual do admin) — o Mercado Pago também reporta esse pagamento
  // como "cancelled", que mapearStatusPagamento traduz pra "expirado". Sem esse corte aqui, verificar
  // de novo rebaixaria o cancelamento pra "expirado" e a cobrança voltaria a ser reenviada no
  // próximo "notificar pendentes".
  if (inscricao.statusPagamento === 'cancelado') {
    return res.json(inscricao);
  }

  try {
    const resultado = await mercadoPagoService.consultarPagamento(inscricao.mpPaymentId);

    if (resultado.statusPagamento !== inscricao.statusPagamento) {
      await inscricao.update({ statusPagamento: resultado.statusPagamento });
    }

    res.json(inscricao);
  } catch (err) {
    if (err.interno) {
      logErro('Erro de configuração ao consultar pagamento no Mercado Pago:', err);
      return res.status(500).json({ error: 'Erro de configuração ao consultar o Mercado Pago.' });
    }

    logErro('Erro ao consultar status do pagamento no Mercado Pago:', err);
    res.status(502).json({ error: 'Não foi possível consultar o status do pagamento agora. Tente novamente.' });
  }
}

// Cancela a cobrança Pix no Mercado Pago pra ninguém pagar por engano depois que o admin já não
// quer mais aquele pagamento em aberto. O MP só aceita cancelar pagamento "pending" — por isso a
// checagem de statusPagamento aqui, antes de gastar a chamada.
async function cancelarPagamento(req, res) {
  const inscricao = await EventoAluno.findByPk(req.params.id);

  if (!inscricao) {
    return res.status(404).json({ error: 'Inscrição não encontrada.' });
  }

  if (!inscricao.mpPaymentId) {
    return res.status(400).json({ error: 'Esta inscrição não possui um pagamento via Mercado Pago associado.' });
  }

  if (inscricao.statusPagamento !== 'pendente') {
    return res.status(400).json({ error: 'Só é possível cancelar um pagamento que ainda está pendente.' });
  }

  try {
    await mercadoPagoService.cancelarPagamento(inscricao.mpPaymentId);
    await inscricao.update({ statusPagamento: 'cancelado' });
    res.json(inscricao);
  } catch (err) {
    if (err.interno) {
      logErro('Erro de configuração ao cancelar pagamento no Mercado Pago:', err);
      return res.status(500).json({ error: 'Erro de configuração ao cancelar o pagamento no Mercado Pago.' });
    }

    logErro('Erro ao cancelar pagamento no Mercado Pago:', err);
    res.status(502).json({ error: 'Não foi possível cancelar o pagamento agora. Tente novamente.' });
  }
}

// Permite corrigir dados cadastrais digitados errado na inscrição pública (nome, contato, faixa,
// carteirinha). De propósito NÃO toca em campos derivados de regra de negócio — valorCobrado,
// statusPagamento, apto, carteirinhaValida, origemDados — nem nos dados do Mercado Pago: esses têm
// fluxos próprios (verificar/cancelar pagamento) e recalculá-los aqui abriria brecha pra
// inconsistência entre o que foi cobrado e o que está cadastrado.
async function atualizarInscricao(req, res) {
  const inscricao = await EventoAluno.findByPk(req.params.id);

  if (!inscricao) {
    return res.status(404).json({ error: 'Inscrição não encontrada.' });
  }

  const {
    nome,
    email,
    telefone,
    faixa,
    faixaAtual,
    tamanhoFaixa,
    dataNascimento,
    responsavel,
    numeroCarteirinha,
    validadeCarteirinha,
  } = req.body;

  try {
    await inscricao.update({
      nome,
      email,
      telefone,
      faixa,
      faixaAtual,
      tamanhoFaixa,
      dataNascimento,
      responsavel,
      numeroCarteirinha,
      validadeCarteirinha,
    });
    res.json(inscricao);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Cadastra o inscrito como Aluno no próprio Sanryu (tabela Aluno) — reaproveita um Aluno já
// existente com o mesmo email em vez de duplicar. Se o instrutor responsável do evento tiver uma
// Turma (e o admin escolher uma via turmaId), já matricula o aluno nela também.
async function cadastrarComoAluno(req, res) {
  const { turmaId } = req.body;
  const inscricao = await EventoAluno.findByPk(req.params.id);

  if (!inscricao) {
    return res.status(404).json({ error: 'Inscrição não encontrada.' });
  }

  if (inscricao.alunoId) {
    return res.status(400).json({ error: 'Este inscrito já foi cadastrado como aluno no Sanryu.' });
  }

  try {
    let turma = null;
    if (turmaId) {
      turma = await Turma.findByPk(turmaId);
      if (!turma) {
        return res.status(400).json({ error: 'Turma não encontrada.' });
      }
    }

    let aluno = await Aluno.findOne({ where: { email: inscricao.email } });

    if (!aluno) {
      const faixaNome = inscricao.faixaAtual || inscricao.faixa || null;
      const faixa = faixaNome ? await Faixa.findOne({ where: { nome: faixaNome } }) : null;

      aluno = await Aluno.create({
        nome: inscricao.nome || inscricao.email,
        email: inscricao.email,
        telefone: inscricao.telefone || null,
        dataNascimento: inscricao.dataNascimento || null,
        faixaId: faixa ? faixa.id : null,
      });
    }

    let matriculado = false;
    if (turma) {
      const jaMatriculado = await Matricula.findOne({ where: { alunoId: aluno.id, turmaId: turma.id } });
      if (!jaMatriculado) {
        await Matricula.create({ alunoId: aluno.id, turmaId: turma.id });
      }
      matriculado = true;
    }

    await inscricao.update({ alunoId: aluno.id });
    res.json({ inscricao, aluno, matriculado });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Cadastra um inscrito (que não veio do Gatame, ou seja, sem carteirinha já emitida por lá) como
// aluno novo no Gatame. Usa o instrutor responsável do evento como "professor" do cadastro — por
// isso exige que o evento tenha um instrutor com email definido antes de permitir a ação.
async function cadastrarNoGatame(req, res) {
  const inscricao = await EventoAluno.findByPk(req.params.id);

  if (!inscricao) {
    return res.status(404).json({ error: 'Inscrição não encontrada.' });
  }

  if (inscricao.origemDados === 'gatame') {
    return res.status(400).json({ error: 'Este inscrito já veio do Gatame — não precisa ser cadastrado.' });
  }

  if (inscricao.cadastradoNoGatame) {
    return res.status(400).json({ error: 'Este inscrito já foi cadastrado como aluno no Gatame.' });
  }

  const evento = await Evento.findByPk(inscricao.eventoId, { include: [{ model: Instrutor, as: 'instrutor' }] });

  if (!evento?.instrutor?.email) {
    return res.status(400).json({ error: 'Defina o instrutor responsável do evento (com email cadastrado) antes de cadastrar o aluno.' });
  }

  try {
    await gatameService.cadastrarAluno({
      emailProfessor: evento.instrutor.email,
      emailAluno: inscricao.email,
      nome: inscricao.nome,
      faixa: inscricao.faixaAtual || inscricao.faixa || 'Branca',
      tamanhoFaixa: inscricao.tamanhoFaixa,
      dataNascimento: inscricao.dataNascimento,
      numeroCarteirinha: inscricao.numeroCarteirinha,
      observacao: `Cadastrado via inscrição no evento "${evento.nome}".`,
    });

    await inscricao.update({ cadastradoNoGatame: true });
    res.json(inscricao);
  } catch (err) {
    if (err.interno) {
      logErro('Erro de configuração ao cadastrar aluno no Gatame:', err);
      return res.status(500).json({ error: 'Erro de configuração ao cadastrar aluno no Gatame.' });
    }

    // "aluno_duplicado" significa que o aluno já existe no Gatame — ou seja, o estado que a gente
    // queria já é verdade. Marca como cadastrado em vez de mostrar isso como uma falha.
    if (err.codigo === 'aluno_duplicado') {
      await inscricao.update({ cadastradoNoGatame: true });
      return res.json(inscricao);
    }

    if (err.status && err.status < 500) {
      return res.status(400).json({ error: err.message });
    }

    logErro('Erro ao cadastrar aluno no Gatame:', err);
    res.status(502).json({ error: 'Não foi possível cadastrar o aluno no Gatame agora. Tente novamente.' });
  }
}

// Reenvia o lembrete de pagamento pra todo mundo com statusPagamento "pendente" nesse evento. Se o
// QR code/Pix já passou das 24h de validade (o normal, já que ninguém manda lembrete minutos depois
// da inscrição), gera um novo pagamento antes de enviar — do contrário a pessoa receberia um QR
// morto. Aguarda todos os envios (diferente da confirmação na inscrição pública, que não espera) —
// aqui quem clicou é o admin, que quer saber quantos foram enviados de verdade.
async function notificarPendentes(req, res) {
  const evento = await Evento.findByPk(req.params.id);

  if (!evento) {
    return res.status(404).json({ error: 'Evento não encontrado.' });
  }

  // "expirado" (pagamento rejeitado/cancelado no Mercado Pago) também precisa de lembrete — sem
  // isso, quem teve o Pix recusado ficava sem nenhum aviso pra tentar de novo.
  const pendentes = await EventoAluno.findAll({ where: { eventoId: evento.id, statusPagamento: ['pendente', 'expirado'] } });

  if (pendentes.length === 0) {
    return res.json({ enviados: 0 });
  }

  await Promise.all(
    pendentes.map(async (eventoAluno) => {
      // "expirado" sempre regenera (o pagamento anterior já morreu no Mercado Pago); "pendente" só
      // regenera se o QR atual passou das 24h de validade.
      const precisaPixNovo = Number(eventoAluno.valorCobrado) > 0 && (eventoAluno.statusPagamento === 'expirado' || qrExpirado(eventoAluno));

      if (precisaPixNovo) {
        const novoPagamento = await gerarPagamentoPix({ valor: eventoAluno.valorCobrado, evento, email: eventoAluno.email });
        await eventoAluno.update({ ...novoPagamento, statusPagamento: 'pendente' });
      }

      await emailService.enviarLembretePagamentoPendente({ evento, eventoAluno });
    })
  );

  res.json({ enviados: pendentes.length });
}

module.exports = {
  listar,
  buscarPorId,
  criar,
  atualizar,
  remover,
  listarInscricoes,
  atualizarInscricao,
  verificarPagamento,
  cancelarPagamento,
  cadastrarComoAluno,
  cadastrarNoGatame,
  notificarPendentes,
};
