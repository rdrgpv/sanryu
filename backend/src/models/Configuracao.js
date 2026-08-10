const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Configuracao = sequelize.define(
  'Configuracao',
  {
    sistema: {
      type: DataTypes.CHAR(3),
      allowNull: false,
    },
    parametro: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    valor: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    tipoParametro: {
      type: DataTypes.CHAR(1),
      allowNull: false,
    },
  },
  {
    indexes: [{ unique: true, fields: ['sistema', 'parametro'] }],
  }
);

module.exports = Configuracao;
