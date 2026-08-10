const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TipoEvento = sequelize.define('TipoEvento', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  cobravel: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
});

module.exports = TipoEvento;
