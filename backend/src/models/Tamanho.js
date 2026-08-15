const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Tamanho = sequelize.define('Tamanho', {
  descricao: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  ordem: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

module.exports = Tamanho;
