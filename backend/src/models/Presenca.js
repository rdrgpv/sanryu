const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Uma linha por aluno presente numa aula (turma + dia). Falta é a ausência da linha num dia em que
// a turma teve chamada — por isso "aulas dadas" = dias distintos com chamada registrada na turma.
const Presenca = sequelize.define(
  'Presenca',
  {
    alunoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    turmaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    data: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    // Login (tabela Admin) de quem fez a chamada — sensei ou admin.
    registradoPorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    indexes: [{ unique: true, fields: ['alunoId', 'turmaId', 'data'] }],
  }
);

module.exports = Presenca;
