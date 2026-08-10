const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EventoAluno = sequelize.define('EventoAluno', {
  eventoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  faixa: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dataNascimento: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  numeroCarteirinha: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  validadeCarteirinha: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  origemDados: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  apto: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  valorCobrado: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  statusPagamento: {
    type: DataTypes.ENUM('pendente', 'pago', 'expirado'),
    allowNull: false,
    defaultValue: 'pendente',
  },
  qrcodePix: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  pixCopiaCola: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  mpPaymentId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = EventoAluno;
