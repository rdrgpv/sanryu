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
  cidade: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'SAO PAULO',
  },
});

module.exports = Banco;
