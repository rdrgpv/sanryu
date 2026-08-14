require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./src/models');
const authRoutes = require('./src/routes/auth');
const publicRoutes = require('./src/routes/public');
const adminRoutes = require('./src/routes/admin');
const seed = require('./seed');
const { logErro } = require('./src/utils/logger');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '6mb' }));

app.use('/api/auth', authRoutes);
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

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

// sequelize.sync() sincroniza as tabelas em ordem de dependência (FK), mas para no primeiro erro —
// uma tabela com problema (ex.: índice único conflitante) travava a sincronização de TODAS as
// tabelas seguintes na ordem, mesmo sem relação nenhuma com o problema. Aqui, se o sync em lote
// falhar, cai pra sincronizar tabela por tabela (mesma ordem seguraque o sync() usa por baixo dos
// panos) e segue adiante mesmo se uma falhar, em vez de abortar tudo.
async function sincronizarBanco(options) {
  try {
    await sequelize.sync(options);
  } catch (erroEmLote) {
    logErro('sequelize.sync() em lote falhou, tentando tabela por tabela:', erroEmLote);

    const modelosOrdenados = sequelize.modelManager.getModelsTopoSortedByForeignKey();
    const ordemSegura = modelosOrdenados ? [...modelosOrdenados].reverse() : sequelize.modelManager.models;

    for (const model of ordemSegura) {
      try {
        await model.sync(options);
      } catch (erroModelo) {
        logErro(`Falha ao sincronizar a tabela "${model.name}":`, erroModelo);
      }
    }
  }
}

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Servidor San·Ryu Dojo rodando em http://0.0.0.0:${PORT}`);

  try {
    await sequelize.authenticate();
    // alter:true reconstrói tabelas via backup-table no SQLite (dialeto sem ALTER TABLE
    // completo), o que corrompe índices únicos compostos — mantém sync() simples ali e
    // só usa alter no MySQL (ALTER TABLE nativo, seguro para esse tipo de mudança aditiva).
    await sincronizarBanco({ alter: sequelize.getDialect() !== 'sqlite' });
    console.log('Banco de dados conectado.');
  } catch (error) {
    logErro('Erro ao conectar/sincronizar o banco de dados:', error);
  }
});
