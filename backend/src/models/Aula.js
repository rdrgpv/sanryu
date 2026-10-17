const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Marca que a chamada de uma turma num dia foi feita (mesmo que ninguém tenha vindo) — sem isso,
// uma aula com zero presentes não contaria como aula dada e a frequência de todos sairia errada.
const Aula = sequelize.define(
  'Aula',
  {
    turmaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    data: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    registradoPorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    indexes: [{ unique: true, fields: ['turmaId', 'data'] }],
  }
);

module.exports = Aula;
