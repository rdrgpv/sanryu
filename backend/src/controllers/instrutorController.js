const bcrypt = require('bcryptjs');
const { Instrutor, Faixa, Admin } = require('../models');

// Só o login (nunca o hash) — a tela mostra se o sensei já tem acesso à chamada.
const INCLUDE_ACESSO = { model: Admin, as: 'acesso', attributes: ['id', 'username'] };

async function listar(req, res) {
  const instrutores = await Instrutor.findAll({
    include: [{ model: Faixa, as: 'faixa' }, ...(req.baseUrl.endsWith('/admin') ? [INCLUDE_ACESSO] : [])],
    order: [['nome', 'ASC']],
  });
  res.json(instrutores);
}

// Site: só quem está marcado pra aparecer, sem e-mail nem dados internos.
async function listarPublico(req, res) {
  const instrutores = await Instrutor.unscoped().findAll({
    where: { exibirNoSite: true },
    attributes: ['id', 'nome', 'especialidade', 'bio', 'foto', 'fotoUrl', 'titulos'],
    include: [{ model: Faixa, as: 'faixa', attributes: ['nome', 'grau', 'cor'] }],
    order: [['nome', 'ASC']],
  });

  res.json(
    instrutores.map((instrutor) => ({
      id: instrutor.id,
      nome: instrutor.nome,
      especialidade: instrutor.especialidade,
      bio: instrutor.bio,
      foto: instrutor.foto || instrutor.fotoUrl || null,
      titulos: instrutor.titulos,
      faixa: instrutor.faixa,
    }))
  );
}

async function buscarPorId(req, res) {
  const instrutor = await Instrutor.unscoped().findByPk(req.params.id, {
    include: [{ model: Faixa, as: 'faixa' }],
  });

  if (!instrutor) {
    return res.status(404).json({ error: 'Instrutor não encontrado.' });
  }

  res.json(instrutor);
}

async function criar(req, res) {
  try {
    const instrutor = await Instrutor.create(req.body);
    res.status(201).json(instrutor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function atualizar(req, res) {
  const instrutor = await Instrutor.findByPk(req.params.id);

  if (!instrutor) {
    return res.status(404).json({ error: 'Instrutor não encontrado.' });
  }

  try {
    await instrutor.update(req.body);
    res.json(instrutor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remover(req, res) {
  const instrutor = await Instrutor.findByPk(req.params.id);

  if (!instrutor) {
    return res.status(404).json({ error: 'Instrutor não encontrado.' });
  }

  await instrutor.destroy();
  res.status(204).send();
}

// Cria ou troca o login do sensei (perfil "instrutor": só acessa a chamada das próprias turmas).
async function salvarAcesso(req, res) {
  const instrutor = await Instrutor.findByPk(req.params.id, { include: INCLUDE_ACESSO });

  if (!instrutor) {
    return res.status(404).json({ error: 'Instrutor não encontrado.' });
  }

  const username = (req.body.username || '').trim().toLowerCase();
  const senha = req.body.senha || '';

  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    return res.status(400).json({ error: 'Usuário deve ter de 3 a 40 letras, números, ponto, hífen ou sublinhado.' });
  }

  if (!instrutor.acesso && senha.length < 8) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres.' });
  }

  if (senha && senha.length < 8) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres.' });
  }

  const emUso = await Admin.findOne({ where: { username } });
  if (emUso && emUso.id !== instrutor.acesso?.id) {
    return res.status(400).json({ error: 'Este usuário já está em uso.' });
  }

  const dados = { username, nome: instrutor.nome, perfil: 'instrutor', instrutorId: instrutor.id };
  if (senha) dados.passwordHash = await bcrypt.hash(senha, 10);

  if (instrutor.acesso) {
    await Admin.update(dados, { where: { id: instrutor.acesso.id } });
  } else {
    await Admin.create(dados);
  }

  res.json({ username });
}

async function removerAcesso(req, res) {
  await Admin.destroy({ where: { instrutorId: req.params.id, perfil: 'instrutor' } });
  res.status(204).send();
}

module.exports = { listar, listarPublico, buscarPorId, criar, atualizar, remover, salvarAcesso, removerAcesso };
