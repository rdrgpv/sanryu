const { Op } = require('sequelize');
const { sequelize, Aluno, Turma, Matricula, Faixa, Instrutor, Unidade, Responsavel } = require('../models');
const gatameService = require('../services/gatameService');
const { logErro } = require('../utils/logger');

// Campos que o formulário do admin pode gravar — o resto (id, ativo, cadastradoNoGatame...) é
// controlado pelo sistema. Texto vazio vira null pra não gravar "" em data/enum/email.
const CAMPOS_EDITAVEIS = [
  'nome', 'email', 'telefone', 'dataNascimento', 'cpf', 'rg', 'sexo', 'foto',
  'unidadeId', 'faixaId', 'tamanhoFaixa', 'dataInicio', 'situacao',
  'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf',
  'responsavelId', 'parentescoResponsavel',
  'contatoEmergenciaNome', 'contatoEmergenciaTelefone', 'contatoEmergenciaParentesco',
  'tipoSanguineo', 'alergias', 'medicamentos', 'restricoesMedicas', 'observacoes',
  'consentimentoBiometria',
];

function dadosAluno(body) {
  const dados = {};

  CAMPOS_EDITAVEIS.forEach((campo) => {
    if (body[campo] === undefined) return;
    const valor = typeof body[campo] === 'string' ? body[campo].trim() : body[campo];
    dados[campo] = valor === '' ? null : valor;
  });

  return dados;
}

// O formulário pode mandar um responsável novo (responsavelNovo) em vez de escolher um existente —
// cria os dois na mesma transação pra não sobrar responsável solto se o aluno falhar na validação.
async function salvarAluno(aluno, body) {
  return sequelize.transaction(async (transaction) => {
    const dados = dadosAluno(body);

    // Data/origem do consentimento só mudam quando ele muda (marcar de novo não "renova" a data).
    if (dados.consentimentoBiometria !== undefined) {
      const antes = Boolean(aluno?.consentimentoBiometria);
      const depois = Boolean(dados.consentimentoBiometria);
      dados.consentimentoBiometria = depois;
      if (depois && !antes) Object.assign(dados, { consentimentoBiometriaEm: new Date(), consentimentoBiometriaOrigem: 'cadastro' });
      if (!depois) Object.assign(dados, { consentimentoBiometriaEm: null, consentimentoBiometriaOrigem: null });
    }

    if (body.responsavelNovo?.nome?.trim()) {
      const responsavel = await Responsavel.create(body.responsavelNovo, { transaction });
      dados.responsavelId = responsavel.id;
    }

    if (aluno) {
      return aluno.update(dados, { transaction });
    }

    return Aluno.create(dados, { transaction });
  });
}

async function listar(req, res) {
  const { busca, unidadeId, situacao } = req.query;
  const where = {};

  if (busca) {
    where[Op.or] = [
      { nome: { [Op.like]: `%${busca}%` } },
      { email: { [Op.like]: `%${busca}%` } },
      { cpf: { [Op.like]: `%${busca}%` } },
    ];
  }

  if (unidadeId) where.unidadeId = unidadeId;
  if (situacao) where.situacao = situacao;

  const alunos = await Aluno.findAll({
    where,
    // Sem a foto: na listagem ela só pesaria a resposta (vem no buscarPorId).
    attributes: { exclude: ['foto'] },
    include: [
      { model: Turma, as: 'turmas', through: { attributes: ['status', 'dataMatricula'] } },
      { model: Faixa, as: 'faixa' },
      { model: Unidade, as: 'unidade', attributes: ['id', 'nome'] },
      { model: Responsavel, as: 'responsavel', attributes: ['id', 'nome', 'telefone'] },
    ],
    order: [['nome', 'ASC']],
  });

  res.json(alunos);
}

async function buscarPorId(req, res) {
  const aluno = await Aluno.findByPk(req.params.id, {
    include: [
      { model: Turma, as: 'turmas', through: { attributes: ['status', 'dataMatricula'] } },
      { model: Faixa, as: 'faixa' },
      { model: Unidade, as: 'unidade', attributes: ['id', 'nome'] },
      { model: Responsavel, as: 'responsavel' },
    ],
  });

  if (!aluno) {
    return res.status(404).json({ error: 'Aluno não encontrado.' });
  }

  res.json(aluno);
}

async function criar(req, res) {
  try {
    const aluno = await salvarAluno(null, req.body);
    res.status(201).json(aluno);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function atualizar(req, res) {
  const aluno = await Aluno.findByPk(req.params.id);

  if (!aluno) {
    return res.status(404).json({ error: 'Aluno não encontrado.' });
  }

  try {
    await salvarAluno(aluno, req.body);
    res.json(aluno);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remover(req, res) {
  const aluno = await Aluno.findByPk(req.params.id);

  if (!aluno) {
    return res.status(404).json({ error: 'Aluno não encontrado.' });
  }

  await aluno.destroy();
  res.status(204).send();
}

async function matricular(req, res) {
  const { turmaId } = req.body;
  const aluno = await Aluno.findByPk(req.params.id);

  if (!aluno) {
    return res.status(404).json({ error: 'Aluno não encontrado.' });
  }

  const turma = await Turma.findByPk(turmaId);

  if (!turma) {
    return res.status(404).json({ error: 'Turma não encontrada.' });
  }

  const matricula = await Matricula.create({ alunoId: aluno.id, turmaId: turma.id });
  res.status(201).json(matricula);
}

// Consulta se o aluno já existe no Gatame pelo email — independente de ele ter passado pelo fluxo
// de "cadastrar no Gatame" a partir de uma inscrição (pode já existir lá por outro caminho, ex.:
// cadastro direto feito por outro instrutor).
async function verificarGatame(req, res) {
  const aluno = await Aluno.findByPk(req.params.id);

  if (!aluno) {
    return res.status(404).json({ error: 'Aluno não encontrado.' });
  }

  if (!aluno.email) {
    return res.status(400).json({ error: 'Aluno sem email cadastrado — não é possível consultar o Gatame.' });
  }

  try {
    const resultado = await gatameService.consultarAluno(aluno.email);

    if (!resultado.apto) {
      return res.json({ apto: false });
    }

    // A consulta de carteirinha agrega mais de uma origem (Gatame, Morganti University etc.) — só
    // marca como cadastrado no Gatame quando algum candidato realmente vem de lá, senão o campo
    // ficaria "Cadastrado" pra quem só existe em outro sistema.
    const encontradoNoGatame = resultado.candidatos.some((raw) => raw.origem === 'gatame');
    if (encontradoNoGatame && !aluno.cadastradoNoGatame) {
      await aluno.update({ cadastradoNoGatame: true });
    }

    res.json({
      apto: true,
      candidatos: resultado.candidatos.map((raw) => ({
        nome: raw.nome,
        faixa: raw.faixa || null,
        origem: raw.origem,
      })),
    });
  } catch (err) {
    if (err.interno) {
      logErro('Erro de configuração ao consultar o Gatame:', err);
      return res.status(500).json({ error: 'Erro de configuração ao consultar o Gatame.' });
    }

    logErro('Erro ao consultar o Gatame:', err);
    res.status(502).json({ error: 'Não foi possível consultar o Gatame agora. Tente novamente.' });
  }
}

// Cadastra o aluno como aluno novo no Gatame. Diferente do fluxo de inscrição em evento (que usa o
// instrutor do evento como professor responsável), aqui o professor responsável é inferido da(s)
// turma(s) em que o aluno está matriculado ativamente — só funciona quando há exatamente um
// instrutor (com email) entre elas; caso contrário, pede pra resolver a matrícula antes.
async function cadastrarNoGatame(req, res) {
  const aluno = await Aluno.findByPk(req.params.id, {
    include: [
      {
        model: Turma,
        as: 'turmas',
        through: { where: { status: 'ativa' }, attributes: [] },
        include: [{ model: Instrutor, as: 'instrutor' }],
      },
      { model: Faixa, as: 'faixa' },
    ],
  });

  if (!aluno) {
    return res.status(404).json({ error: 'Aluno não encontrado.' });
  }

  if (aluno.cadastradoNoGatame) {
    return res.status(400).json({ error: 'Este aluno já foi cadastrado no Gatame.' });
  }

  if (!aluno.email) {
    return res.status(400).json({ error: 'Aluno sem email cadastrado — o Gatame exige um email.' });
  }

  const instrutoresComEmail = [
    ...new Map(aluno.turmas.filter((turma) => turma.instrutor?.email).map((turma) => [turma.instrutor.email, turma.instrutor])).values(),
  ];

  if (instrutoresComEmail.length === 0) {
    return res.status(400).json({
      error: 'Este aluno não está matriculado em nenhuma turma ativa com instrutor (com email) definido — não é possível determinar o professor responsável.',
    });
  }

  if (instrutoresComEmail.length > 1) {
    return res.status(400).json({
      error: 'Este aluno está matriculado em turmas de mais de um instrutor — não é possível determinar automaticamente o professor responsável.',
    });
  }

  try {
    await gatameService.cadastrarAluno({
      emailProfessor: instrutoresComEmail[0].email,
      emailAluno: aluno.email,
      nome: aluno.nome,
      faixa: aluno.faixa?.nome || 'Branca',
      tamanhoFaixa: aluno.tamanhoFaixa,
      dataNascimento: aluno.dataNascimento,
      observacao: 'Cadastrado via tela de alunos (San·Ryu).',
    });

    await aluno.update({ cadastradoNoGatame: true });
    res.json(aluno);
  } catch (err) {
    if (err.interno) {
      logErro('Erro de configuração ao cadastrar aluno no Gatame:', err);
      return res.status(500).json({ error: 'Erro de configuração ao cadastrar aluno no Gatame.' });
    }

    // "aluno_duplicado" significa que o aluno já existe no Gatame — ou seja, o estado que a gente
    // queria já é verdade. Marca como cadastrado em vez de mostrar isso como uma falha.
    if (err.codigo === 'aluno_duplicado') {
      await aluno.update({ cadastradoNoGatame: true });
      return res.json(aluno);
    }

    if (err.status && err.status < 500) {
      return res.status(400).json({ error: err.message });
    }

    logErro('Erro ao cadastrar aluno no Gatame:', err);
    res.status(502).json({ error: 'Não foi possível cadastrar o aluno no Gatame agora. Tente novamente.' });
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, remover, matricular, verificarGatame, cadastrarNoGatame };
