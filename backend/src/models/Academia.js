const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Academia EXTERNA (de outro professor do Método Morganti), que a gente não administra — só serve
// pra agrupar os alunos externos que aparecem nos eventos e exames de faixa. As unidades do próprio
// dojo são outra coisa (model Unidade). O professor responsável é quem vai como "professor" no
// cadastro do Gatame.
const Academia = sequelize.define('Academia', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  instrutorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  cidade: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  telefone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  observacoes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  // Turma de onde veio na migração (antes as "turmas" faziam o papel de academia) — só rastreio.
  turmaOrigemId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
});

module.exports = Academia;
