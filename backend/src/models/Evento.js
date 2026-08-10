const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Evento = sequelize.define('Evento', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  descricao: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  tipoEventoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  data: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  local: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('agendado', 'realizado', 'cancelado'),
    allowNull: false,
    defaultValue: 'agendado',
  },
  valor: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  publicado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  banner: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
});

module.exports = Evento;
