const { Unidade, Aluno, Turma } = require('../models');

async function listar(req, res) {
  const unidades = await Unidade.findAll({ order: [['nome', 'ASC']] });
  res.json(unidades);
}

async function buscarPorId(req, res) {
  const unidade = await Unidade.findByPk(req.params.id);

  if (!unidade) {
    return res.status(404).json({ error: 'Unidade não encontrada.' });
  }

  res.json(unidade);
}

async function criar(req, res) {
  try {
    const unidade = await Unidade.create(req.body);
    res.status(201).json(unidade);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function atualizar(req, res) {
  const unidade = await Unidade.findByPk(req.params.id);

  if (!unidade) {
    return res.status(404).json({ error: 'Unidade não encontrada.' });
  }

  try {
    await unidade.update(req.body);
    res.json(unidade);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// Não deixa excluir unidade com alunos ou turmas — eles ficariam órfãos. Pra desativar uma unidade
// que já teve movimento, desmarque "Ativa".
async function remover(req, res) {
  const unidade = await Unidade.findByPk(req.params.id);

  if (!unidade) {
    return res.status(404).json({ error: 'Unidade não encontrada.' });
  }

  const [alunos, turmas] = await Promise.all([
    Aluno.count({ where: { unidadeId: unidade.id } }),
    Turma.count({ where: { unidadeId: unidade.id } }),
  ]);

  if (alunos > 0 || turmas > 0) {
    return res.status(400).json({
      error: `Esta unidade tem ${alunos} aluno(s) e ${turmas} turma(s). Mova-os para outra unidade ou desative a unidade.`,
    });
  }

  await unidade.destroy();
  res.status(204).send();
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
