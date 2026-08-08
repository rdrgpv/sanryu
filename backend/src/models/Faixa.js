const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Faixa = sequelize.define('Faixa', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  cor: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  grau: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  ordem: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

module.exports = Faixa;
