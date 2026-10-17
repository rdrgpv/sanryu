const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Admin } = require('../models');

async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
  }

  const admin = await Admin.findOne({ where: { username } });

  if (!admin) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  const senhaValida = await bcrypt.compare(password, admin.passwordHash);

  if (!senhaValida) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  const dados = { id: admin.id, username: admin.username, nome: admin.nome, perfil: admin.perfil || 'admin', instrutorId: admin.instrutorId || null };
  const token = jwt.sign(dados, process.env.JWT_SECRET, { expiresIn: '8h' });

  res.json({ token, admin: dados });
}

module.exports = { login };
