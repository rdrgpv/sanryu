const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Banco = sequelize.define('Banco', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  chavePix: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tipoChave: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  titular: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = Banco;
