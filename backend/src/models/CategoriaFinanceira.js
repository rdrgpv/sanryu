const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Plano de contas simples: de onde vem (receita) e pra onde vai (despesa) o dinheiro. As padrão
// são criadas nos ajustes iniciais; "chave" marca as que os lançamentos automáticos usam.
const CategoriaFinanceira = sequelize.define('CategoriaFinanceira', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tipo: {
    type: DataTypes.ENUM('receita', 'despesa'),
    allowNull: false,
  },
  chave: {
    type: DataTypes.STRING(30),
    allowNull: true,
    unique: true,
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
});

module.exports = CategoriaFinanceira;
