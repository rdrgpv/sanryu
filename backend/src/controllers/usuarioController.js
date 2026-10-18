const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { Admin } = require('../models');

// Logins do painel (admin e recepção). Os do sensei são criados em Instrutores (perfil "instrutor").
const PERFIS_PAINEL = ['admin', 'recepcao'];
const ATRIBUTOS = ['id', 'nome', 'username', 'perfil', 'createdAt'];

function validarUsername(username) {
  return /^[a-z0-9._-]{3,40}$/.test(username);
}

async function listar(req, res) {
  res.json(await Admin.findAll({ where: { perfil: PERFIS_PAINEL }, attributes: ATRIBUTOS, order: [['nome', 'ASC']] }));
}

async function criar(req, res) {
  const nome = (req.body.nome || '').trim();
  const username = (req.body.username || '').trim().toLowerCase();
  const senha = req.body.senha || '';
  const perfil = req.body.perfil;

  if (!nome) return res.status(400).json({ error: 'Informe o nome.' });
  if (!validarUsername(username)) return res.status(400).json({ error: 'Usuário deve ter de 3 a 40 letras, números, ponto, hífen ou sublinhado.' });
  if (senha.length < 8) return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres.' });
  if (!PERFIS_PAINEL.includes(perfil)) return res.status(400).json({ error: 'Perfil inválido.' });
  if (await Admin.findOne({ where: { username } })) return res.status(400).json({ error: 'Este usuário já está em uso.' });

  const usuario = await Admin.create({ nome, username, perfil, passwordHash: await bcrypt.hash(senha, 10) });
  res.status(201).json({ id: usuario.id, nome, username, perfil });
}

async function quantosAdmins(excetoId) {
  return Admin.count({ where: { perfil: 'admin', id: { [Op.ne]: excetoId } } });
}

async function atualizar(req, res) {
  const usuario = await Admin.findOne({ where: { id: req.params.id, perfil: PERFIS_PAINEL } });
  if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado.' });

  const dados = {};
  if (req.body.nome !== undefined) dados.nome = String(req.body.nome).trim();
  if (req.body.perfil !== undefined) {
    if (!PERFIS_PAINEL.includes(req.body.perfil)) return res.status(400).json({ error: 'Perfil inválido.' });
    dados.perfil = req.body.perfil;
  }
  if (req.body.senha) {
    if (req.body.senha.length < 8) return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres.' });
    dados.passwordHash = await bcrypt.hash(req.body.senha, 10);
  }

  // Sempre sobra pelo menos um admin (senão ninguém mais administra o sistema).
  if (usuario.perfil === 'admin' && dados.perfil === 'recepcao' && (await quantosAdmins(usuario.id)) === 0) {
    return res.status(400).json({ error: 'Este é o único admin — crie outro admin antes de mudar o perfil dele.' });
  }
  if (dados.nome === '') return res.status(400).json({ error: 'Informe o nome.' });

  await usuario.update(dados);
  res.json({ id: usuario.id, nome: usuario.nome, username: usuario.username, perfil: usuario.perfil });
}

async function remover(req, res) {
  const usuario = await Admin.findOne({ where: { id: req.params.id, perfil: PERFIS_PAINEL } });
  if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado.' });
  if (usuario.id === req.admin.id) return res.status(400).json({ error: 'Você não pode excluir o seu próprio usuário.' });
  if (usuario.perfil === 'admin' && (await quantosAdmins(usuario.id)) === 0) {
    return res.status(400).json({ error: 'Não dá para excluir o único admin.' });
  }

  await usuario.destroy();
  res.status(204).send();
}

// Qualquer pessoa logada no painel/chamada troca a própria senha (confirmando a atual).
async function trocarMinhaSenha(req, res) {
  const usuario = await Admin.findByPk(req.admin.id);
  if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado.' });

  const { senhaAtual, novaSenha } = req.body;
  if (!(await bcrypt.compare(senhaAtual || '', usuario.passwordHash))) return res.status(400).json({ error: 'Senha atual incorreta.' });
  if (!novaSenha || novaSenha.length < 8) return res.status(400).json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' });

  await usuario.update({ passwordHash: await bcrypt.hash(novaSenha, 10) });
  res.json({ ok: true });
}

module.exports = { listar, criar, atualizar, remover, trocarMinhaSenha };
