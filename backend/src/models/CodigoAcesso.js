const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Código de 6 dígitos mandado por e-mail pra entrar na área do aluno/responsável. Só o hash é
// guardado; vale 15 minutos, aceita poucas tentativas e é de uso único (ver portalController).
const CodigoAcesso = sequelize.define(
  'CodigoAcesso',
  {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    codigoHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    expiraEm: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    tentativas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    usadoEm: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    indexes: [{ fields: ['email'] }],
  }
);

module.exports = CodigoAcesso;
