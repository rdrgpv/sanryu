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
  valor: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  // Treinamento: inscrição aberta (sem consultar a carteirinha no Gatame/Morganti University) e
  // certificado de participação por e-mail no final. Ver certificadoService.
  treinamento: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
});

module.exports = TipoEvento;
