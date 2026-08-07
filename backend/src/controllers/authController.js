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

  const token = jwt.sign(
    { id: admin.id, username: admin.username, nome: admin.nome },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, admin: { id: admin.id, nome: admin.nome, username: admin.username } });
}

module.exports = { login };
