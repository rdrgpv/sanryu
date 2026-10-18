const { Academia, Instrutor, Aluno, sequelize } = require('../models');

const INCLUDE_PROFESSOR = { model: Instrutor, as: 'instrutor', attributes: ['id', 'nome', 'email'] };

async function listar(req, res) {
  const academias = await Academia.findAll({ include: INCLUDE_PROFESSOR, order: [['nome', 'ASC']] });
  const contagem = await Aluno.findAll({
    attributes: ['academiaId', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
    where: { vinculo: 'externo' },
    group: ['academiaId'],
    raw: true,
  });
  const totalPorAcademia = new Map(contagem.map((linha) => [linha.academiaId, Number(linha.total)]));
  res.json(academias.map((academia) => ({ ...academia.toJSON(), totalAlunos: totalPorAcademia.get(academia.id) || 0 })));
}

function dadosAcademia(body) {
  const vazio = (valor) => (typeof valor === 'string' ? valor.trim() : valor) || null;
  return {
    nome: (body.nome || '').trim(),
    instrutorId: vazio(body.instrutorId),
    cidade: vazio(body.cidade),
    telefone: vazio(body.telefone),
    observacoes: vazio(body.observacoes),
    ativo: body.ativo !== false,
  };
}

async function criar(req, res) {
  const dados = dadosAcademia(req.body);
  if (!dados.nome) return res.status(400).json({ error: 'Informe o nome da academia.' });
  res.status(201).json(await Academia.create(dados));
}

async function atualizar(req, res) {
  const academia = await Academia.findByPk(req.params.id);
  if (!academia) return res.status(404).json({ error: 'Academia não encontrada.' });
  const dados = dadosAcademia(req.body);
  if (!dados.nome) return res.status(400).json({ error: 'Informe o nome da academia.' });
  await academia.update(dados);
  res.json(academia);
}

async function remover(req, res) {
  const academia = await Academia.findByPk(req.params.id);
  if (!academia) return res.status(404).json({ error: 'Academia não encontrada.' });

  const alunos = await Aluno.count({ where: { academiaId: academia.id } });
  if (alunos > 0) return res.status(400).json({ error: `Esta academia tem ${alunos} aluno(s). Mova-os ou desative a academia.` });

  await academia.destroy();
  res.status(204).send();
}

module.exports = { listar, criar, atualizar, remover };
