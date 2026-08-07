const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Turma = sequelize.define('Turma', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  modalidade: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  nivel: {
    type: DataTypes.STRING,
    defaultValue: 'Todos os níveis',
  },
  diaSemana: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  horaInicio: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  horaFim: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  vagas: {
    type: DataTypes.INTEGER,
    defaultValue: 20,
  },
});

module.exports = Turma;
