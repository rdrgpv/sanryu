const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cor = sequelize.define('Cor', {
  descricao: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  corHex: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

module.exports = Cor;
