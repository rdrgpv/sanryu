const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const senseiRoutes = require('./routes/sensei');
const portalRoutes = require('./routes/portal');
const seed = require('../seed');
const { logErro } = require('./utils/logger');

// Monta o app Express (rotas e tratamento de erro) sem subir o servidor nem tocar no banco — o
// server.js sobe de verdade; os testes (test/) usam este mesmo app numa porta aleatória.
const app = express();

// Atrás do proxy reverso da hospedagem, sem isto o req.ip é o IP do PROXY (o mesmo pra todo mundo):
// o limite antispam da aula experimental vira global e o IP gravado nas assinaturas é o do proxy.
// TRUST_PROXY = quantos proxies existem na frente do Node (normalmente "1"), ou a lista de IPs/sub-
// redes deles em notação IPv4 simples ("10.0.0.0/8"). Nunca "true": aí qualquer cliente forja o
// X-Forwarded-For. Sem a variável, fica desligado (padrão do Express).
function configuracaoTrustProxy(valor) {
  const texto = String(valor || '').trim();
  if (!texto || texto === 'false' || texto === '0') return false;
  if (/^\d+$/.test(texto)) return Number(texto);
  if (texto === 'true') throw new Error('TRUST_PROXY=true confia em qualquer cliente; use o número de proxies (ex.: 1).');
  return texto;
}

app.set('trust proxy', configuracaoTrustProxy(process.env.TRUST_PROXY));

app.use(cors());
app.use(express.json({ limit: '6mb' }));

app.use('/api/auth', authRoutes);
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sensei', senseiRoutes);
app.use('/api/portal', portalRoutes);

// TEMPORÁRIO: dispara o seed em produção, remover depois do primeiro uso.
app.post('/api/_seed', async (req, res) => {
  if (!process.env.SEED_KEY || req.headers['x-seed-key'] !== process.env.SEED_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    await seed();
    res.json({ message: 'Seed executado com sucesso.' });
  } catch (error) {
    logErro('Erro ao rodar seed via rota temporária:', error);
    res.status(500).json({ error: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

app.use((err, req, res, next) => {
  logErro('Erro não tratado numa rota:', err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

module.exports = app;
