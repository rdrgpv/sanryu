const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  const token = header.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

// Tokens emitidos antes de existir perfil não têm o campo — eram todos de admin.
function perfilDo(req) {
  return req.admin?.perfil || 'admin';
}

// Depois do auth: bloqueia no servidor (não só esconde na tela) quem não tem o perfil exigido.
function exigirPerfil(...perfis) {
  return (req, res, next) => {
    if (!perfis.includes(perfilDo(req))) {
      return res.status(403).json({ error: 'Sem permissão para acessar este recurso.' });
    }
    next();
  };
}

module.exports = auth;
module.exports.exigirPerfil = exigirPerfil;
module.exports.perfilDo = perfilDo;
