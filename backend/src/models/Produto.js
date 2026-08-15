const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Produto = sequelize.define('Produto', {
  descricao: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tipoProduto: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  controlaEstoque: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

module.exports = Produto;
