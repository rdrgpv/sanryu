require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./src/models');
const authRoutes = require('./src/routes/auth');
const publicRoutes = require('./src/routes/public');
const adminRoutes = require('./src/routes/admin');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Servidor Dojo Sanryu rodando em http://0.0.0.0:${PORT}`);

  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('Banco de dados conectado.');
  } catch (error) {
    console.error('Erro ao conectar/sincronizar o banco de dados:', error);
  }
});
