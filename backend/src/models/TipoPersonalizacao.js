const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TipoPersonalizacao = sequelize.define('TipoPersonalizacao', {
  descricao: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  valorPadrao: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  exigeTexto: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

module.exports = TipoPersonalizacao;
