const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Op, fn, col, where: condicao } = require('sequelize');
const {
  CodigoAcesso,
  Aluno,
  Responsavel,
  Faixa,
  Turma,
  Instrutor,
  Contrato,
  Plano,
  Mensalidade,
  Presenca,
  Aula,
  Matricula,
  Evento,
  TipoEvento,
} = require('../models');
const emailService = require('../services/emailService');
const configService = require('../services/configService');
const { hoje, valorAtualizado } = require('../services/mensalidadeService');
const { logErro } = require('../utils/logger');

const VALIDADE_CODIGO_MIN = 15;
const MAX_TENTATIVAS = 5;
const INTERVALO_MINIMO_MS = 60 * 1000;
const MAX_CODIGOS_POR_HORA = 5;
const VALIDADE_SESSAO = '30d';
const MENSAGEM_ENVIO = 'Se este e-mail estiver cadastrado, enviamos um código de acesso. Confira também a caixa de spam.';

function normalizarEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

// Hash com o segredo do servidor: mesmo com acesso ao banco, não dá pra testar os 10^6 códigos
// offline sem o JWT_SECRET.
function hashCodigo(email, codigo) {
  return crypto.createHmac('sha256', process.env.JWT_SECRET || 'sanryu').update(`${email}:${codigo}`).digest('hex');
}

// Quem esse e-mail enxerga: alunos com esse e-mail + alunos cujo responsável tem esse e-mail.
// Recalculado a cada pedido (não fica no token), então mudanças no cadastro valem na hora.
// Compara sem diferenciar maiúsculas (cadastros antigos podem ter "Maria@Gmail.com").
function emailIgual(email) {
  return condicao(fn('lower', col('email')), email);
}

async function alunosDoEmail(email) {
  const responsaveis = await Responsavel.findAll({ where: emailIgual(email), attributes: ['id', 'nome'] });
  const alunos = await Aluno.findAll({
    where: {
      situacao: { [Op.ne]: 'cancelado' },
      [Op.or]: [emailIgual(email), ...(responsaveis.length ? [{ responsavelId: responsaveis.map((responsavel) => responsavel.id) }] : [])],
    },
    attributes: ['id', 'nome', 'email', 'foto', 'situacao', 'dataNascimento'],
    include: [
      { model: Faixa, as: 'faixa', attributes: ['nome', 'cor', 'grau'] },
      { model: Turma, as: 'turmas', attributes: ['id', 'nome', 'diaSemana', 'horaInicio', 'horaFim'], through: { where: { status: 'ativa' }, attributes: [] } },
    ],
    order: [['nome', 'ASC']],
  });
  return { alunos, nome: responsaveis[0]?.nome || alunos.find((aluno) => (aluno.email || '').toLowerCase() === email)?.nome || alunos[0]?.nome || null };
}

async function urlSite() {
  return ((await configService.obterValor('SITE_URL')) || '').replace(/\/+$/, '');
}

// ---- Login por código ----

async function pedirCodigo(req, res) {
  const email = normalizarEmail(req.body.email);

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Informe um e-mail válido.' });
  }

  try {
    const { alunos } = await alunosDoEmail(email);

    // Resposta igual com ou sem cadastro — não revela quais e-mails existem.
    if (alunos.length === 0) return res.json({ mensagem: MENSAGEM_ENVIO });

    const ultimaHora = await CodigoAcesso.findAll({
      where: { email, createdAt: { [Op.gt]: new Date(Date.now() - 60 * 60 * 1000) } },
      order: [['createdAt', 'DESC']],
    });

    if (ultimaHora[0] && Date.now() - new Date(ultimaHora[0].createdAt).getTime() < INTERVALO_MINIMO_MS) {
      return res.status(429).json({ error: 'Aguarde um minuto antes de pedir outro código.' });
    }

    if (ultimaHora.length >= MAX_CODIGOS_POR_HORA) {
      return res.status(429).json({ error: 'Muitos códigos pedidos. Tente de novo em uma hora.' });
    }

    const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    await CodigoAcesso.create({ email, codigoHash: hashCodigo(email, codigo), expiraEm: new Date(Date.now() + VALIDADE_CODIGO_MIN * 60 * 1000) });

    const enviado = await emailService.enviarCodigoAcesso({ destinatario: email, codigo, minutos: VALIDADE_CODIGO_MIN });

    // Só pra desenvolvimento local sem SMTP — nunca ligar em produção.
    if (!enviado && process.env.PORTAL_CODIGO_NO_LOG === 'sim') console.log(`[portal] código para ${email}: ${codigo}`);

    res.json({ mensagem: MENSAGEM_ENVIO });
  } catch (err) {
    logErro('Erro ao gerar código de acesso do portal:', err);
    res.status(500).json({ error: 'Não foi possível enviar o código agora. Tente novamente.' });
  }
}

async function entrar(req, res) {
  const email = normalizarEmail(req.body.email);
  const codigo = String(req.body.codigo || '').replace(/\D/g, '');

  const pendente = await CodigoAcesso.findOne({
    where: { email, usadoEm: null, expiraEm: { [Op.gt]: new Date() } },
    order: [['createdAt', 'DESC']],
  });

  if (!pendente || pendente.tentativas >= MAX_TENTATIVAS) {
    return res.status(400).json({ error: 'Código expirado ou inválido. Peça um novo código.' });
  }

  if (pendente.codigoHash !== hashCodigo(email, codigo)) {
    await pendente.increment('tentativas');
    const restantes = MAX_TENTATIVAS - pendente.tentativas - 1;
    return res.status(400).json({ error: restantes > 0 ? `Código incorreto. ${restantes} tentativa(s) restante(s).` : 'Código incorreto. Peça um novo código.' });
  }

  await pendente.update({ usadoEm: new Date() });

  const token = jwt.sign({ perfil: 'portal', email }, process.env.JWT_SECRET, { expiresIn: VALIDADE_SESSAO });
  res.json({ token, email });
}

// ---- Dados (rotas autenticadas; req.admin vem do middleware auth) ----

async function eu(req, res) {
  const { alunos, nome } = await alunosDoEmail(req.admin.email);
  res.json({ email: req.admin.email, nome, alunos });
}

async function carregarAlunoPermitido(req, res) {
  const { alunos } = await alunosDoEmail(req.admin.email);
  const aluno = alunos.find((item) => String(item.id) === String(req.params.alunoId));
  if (!aluno) res.status(404).json({ error: 'Aluno não encontrado.' });
  return aluno;
}

function somarDias(data, dias) {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

async function resumoAluno(req, res) {
  const aluno = await carregarAlunoPermitido(req, res);
  if (!aluno) return;

  const dataHoje = hoje();
  const site = await urlSite();
  const link = (caminho) => (site ? `${site}${caminho}` : caminho);
  const inicio90 = somarDias(dataHoje, -90);

  const [contrato, mensalidades, matriculas, presencas] = await Promise.all([
    Contrato.findOne({ where: { alunoId: aluno.id, situacao: 'ativo' }, include: { model: Plano, as: 'plano', attributes: ['nome', 'periodicidade'] } }),
    Mensalidade.findAll({ where: { alunoId: aluno.id, status: { [Op.ne]: 'cancelado' } }, order: [['vencimento', 'DESC']], limit: 18 }),
    Matricula.findAll({ where: { alunoId: aluno.id, status: 'ativa' }, attributes: ['turmaId'] }),
    Presenca.findAll({ where: { alunoId: aluno.id, data: { [Op.gte]: inicio90 } }, attributes: ['data', 'turmaId'], order: [['data', 'DESC']] }),
  ]);

  const turmaIds = matriculas.map((matricula) => matricula.turmaId);
  const aulas = turmaIds.length ? await Aula.findAll({ where: { turmaId: turmaIds, data: { [Op.gte]: inicio90 } }, attributes: ['data', 'turmaId'] }) : [];

  // Frequência por mês (últimos 3): presenças nas turmas dele / aulas dadas nessas turmas.
  const meses = [0, 1, 2].map((atras) => {
    const [ano, mes] = dataHoje.split('-').map(Number);
    return new Date(Date.UTC(ano, mes - 1 - atras, 1)).toISOString().slice(0, 7);
  });
  const frequencia = meses.map((competencia) => {
    const aulasMes = aulas.filter((aula) => aula.data.startsWith(competencia)).length;
    const presencasMes = presencas.filter((presenca) => presenca.data.startsWith(competencia) && turmaIds.includes(presenca.turmaId)).length;
    return { mes: competencia, presencas: presencasMes, aulas: aulasMes, percentual: aulasMes ? Math.round((presencasMes / aulasMes) * 100) : null };
  });

  const listaMensalidades = await Promise.all(
    mensalidades.map(async (mensalidade) => {
      const atualizado = mensalidade.status === 'pendente' ? await valorAtualizado(mensalidade) : null;
      return {
        id: mensalidade.id,
        competencia: mensalidade.competencia,
        vencimento: mensalidade.vencimento,
        status: mensalidade.status,
        vencida: mensalidade.status === 'pendente' && mensalidade.vencimento < dataHoje,
        valor: mensalidade.status === 'pago' ? mensalidade.valorPago : atualizado?.total ?? mensalidade.valor,
        pagoEm: mensalidade.pagoEm,
        linkPagamento: mensalidade.status === 'pendente' ? link(`/mensalidades/${mensalidade.token}`) : null,
      };
    })
  );

  res.json({
    aluno,
    contrato: contrato && {
      plano: contrato.plano?.nome,
      periodicidade: contrato.plano?.periodicidade,
      valor: contrato.valorFinal,
      diaVencimento: contrato.diaVencimento,
      dataInicio: contrato.dataInicio,
      assinado: Boolean(contrato.assinadoEm),
      assinadoEm: contrato.assinadoEm,
      // Mesmo link público de assinatura/visualização usado pelo admin.
      link: link(`/contratos/${contrato.tokenAssinatura}`),
    },
    mensalidades: listaMensalidades,
    frequencia,
    ultimasPresencas: presencas.slice(0, 10).map((presenca) => presenca.data),
  });
}

async function eventos(req, res) {
  const site = await urlSite();
  const lista = await Evento.findAll({
    where: { publicado: true, status: 'agendado', data: { [Op.gte]: new Date() } },
    attributes: ['id', 'slug', 'nome', 'data', 'local'],
    include: { model: TipoEvento, as: 'tipoEvento', attributes: ['nome'] },
    order: [['data', 'ASC']],
    limit: 6,
  });

  res.json(
    lista.map((evento) => ({
      ...evento.toJSON(),
      linkInscricao: `${site}/eventos/${evento.slug || evento.id}`,
    }))
  );
}

module.exports = { pedirCodigo, entrar, eu, resumoAluno, eventos, alunosDoEmail };
