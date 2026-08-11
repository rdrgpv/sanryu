const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Aluno = sequelize.define('Aluno', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  telefone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dataNascimento: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  faixaId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

module.exports = Aluno;
