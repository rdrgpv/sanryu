const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Unidade (filial) da academia — alunos e turmas pertencem a uma. Começa com uma só, mas o
// sistema já separa tudo por unidade pra quando abrirem outras.
const Unidade = sequelize.define('Unidade', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  telefone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  endereco: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
});

module.exports = Unidade;
