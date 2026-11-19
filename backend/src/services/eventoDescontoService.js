const { EventoDesconto, EventoAluno, Evento } = require('../models');
const mercadoPagoService = require('./mercadoPagoService');
const emailService = require('./emailService');
const { gerarPagamentoPix } = require('./pagamentoInscricaoService');
const { logErro } = require('../utils/logger');

// Comparação de nome sem acento/maiúscula/espaço sobrando ("José  Silva" = "jose silva").
function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function confere(desconto, email, nome) {
  if (normalizar(desconto.email) !== normalizar(email)) return false;
  return !desconto.nome || normalizar(desconto.nome) === normalizar(nome);
}

// Valor especial da pessoa nesse evento, se houver e ainda não usado em outra inscrição.
async function encontrar(eventoId, email, nome, eventoAlunoId = null) {
  const descontos = await EventoDesconto.findAll({ where: { eventoId } });
  return (
    descontos.find((desconto) => confere(desconto, email, nome) && (!desconto.eventoAlunoId || desconto.eventoAlunoId === eventoAlunoId)) || null
  );
}

// Troca o valor de uma inscrição ainda não paga: cancela o Pix antigo e gera outro com o valor novo
// (valor 0 = inscrição já fica paga), e reenvia a confirmação com o Pix certo.
async function aplicarEmInscricao(desconto, inscricao) {
  if (inscricao.statusPagamento === 'pago') {
    throw new Error('Esta pessoa já pagou a inscrição. O valor especial não pode ser aplicado (a diferença precisa ser devolvida à parte).');
  }

  const evento = await Evento.findByPk(inscricao.eventoId);
  const valor = Number(desconto.valor);

  if (inscricao.mpPaymentId) {
    await mercadoPagoService.cancelarPagamento(inscricao.mpPaymentId).catch((err) => logErro('Erro ao cancelar o Pix antigo da inscrição:', err));
  }

  const pagamento = valor > 0 ? await gerarPagamentoPix({ valor, evento, email: inscricao.email }) : { qrcodePix: null, pixCopiaCola: null, mpPaymentId: null };
  await inscricao.update({
    valorOriginal: inscricao.valorOriginal ?? inscricao.valorCobrado,
    valorCobrado: valor,
    eventoDescontoId: desconto.id,
    statusPagamento: valor > 0 ? 'pendente' : 'pago',
    ...pagamento,
  });
  await desconto.update({ eventoAlunoId: inscricao.id });

  emailService.enviarConfirmacaoInscricao({ evento, eventoAluno: inscricao });
}

async function listar(eventoId) {
  return EventoDesconto.findAll({
    where: { eventoId },
    include: { model: EventoAluno, as: 'inscricao', attributes: ['id', 'nome', 'faixa', 'faixaAtual', 'dataNascimento', 'telefone', 'statusPagamento', 'valorOriginal', 'valorCobrado', 'numeroCarteirinha'] },
    order: [['createdAt', 'DESC']],
  });
}

async function criar(eventoId, dados) {
  const evento = await Evento.findByPk(eventoId);
  if (!evento) throw new Error('Evento não encontrado.');

  const email = String(dados.email || '').trim().toLowerCase();
  const nome = String(dados.nome || '').trim() || null;
  const valor = Number(dados.valor);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Informe o e-mail que a pessoa usa na inscrição.');
  if (dados.valor === '' || dados.valor == null || !Number.isFinite(valor) || valor < 0) throw new Error('Informe o valor a cobrar (0 para isentar).');

  const repetido = (await EventoDesconto.findAll({ where: { eventoId } })).find(
    (desconto) => normalizar(desconto.email) === email && normalizar(desconto.nome) === normalizar(nome)
  );
  if (repetido) throw new Error('Já existe um valor especial para esta pessoa neste evento. Exclua o anterior para trocar.');

  // Já inscrita? Procura antes de gravar, pra não deixar um desconto que não pode ser usado.
  const inscricoes = await EventoAluno.findAll({ where: { eventoId } });
  const candidatas = inscricoes.filter((inscricao) => confere({ email, nome }, inscricao.email, inscricao.nome) && !inscricao.eventoDescontoId);
  if (candidatas.length > 1) {
    throw new Error('Há mais de uma inscrição com este e-mail (ex.: irmãos). Preencha o nome para indicar qual delas recebe o valor especial.');
  }
  if (candidatas[0]?.statusPagamento === 'pago') {
    throw new Error('Esta pessoa já pagou a inscrição. O valor especial não pode ser aplicado (a diferença precisa ser devolvida à parte).');
  }

  const desconto = await EventoDesconto.create({
    eventoId,
    email,
    nome,
    valor: Math.round(valor * 100) / 100,
    motivo: String(dados.motivo || '').trim() || null,
    carteirinhaPendente: Boolean(dados.carteirinhaPendente),
  });

  if (candidatas[0]) await aplicarEmInscricao(desconto, candidatas[0]);
  return EventoDesconto.findByPk(desconto.id, { include: { model: EventoAluno, as: 'inscricao' } });
}

// Só dá pra excluir enquanto não foi usado numa inscrição (aí o valor já foi cobrado/enviado).
async function remover(eventoId, id) {
  const desconto = await EventoDesconto.findOne({ where: { id, eventoId } });
  if (!desconto) throw new Error('Valor especial não encontrado.');
  if (desconto.eventoAlunoId) throw new Error('Este valor especial já foi aplicado na inscrição e não pode ser excluído.');
  await desconto.destroy();
}

async function marcarCarteirinha(eventoId, id, enviada) {
  const desconto = await EventoDesconto.findOne({ where: { id, eventoId } });
  if (!desconto) throw new Error('Valor especial não encontrado.');
  await desconto.update({ carteirinhaEnviadaEm: enviada ? new Date() : null });
  return desconto;
}

module.exports = { encontrar, listar, criar, remover, marcarCarteirinha, normalizar };
