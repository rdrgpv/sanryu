const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Instrutor = sequelize.define('Instrutor', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  faixa: {
    type: DataTypes.STRING,
    defaultValue: 'Preta',
  },
  especialidade: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  fotoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = Instrutor;
