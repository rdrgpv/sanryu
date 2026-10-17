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
