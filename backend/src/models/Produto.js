const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Produto = sequelize.define('Produto', {
  descricao: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tipoProduto: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  controlaEstoque: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  // Aparece na loja da área do aluno (venda com Pix e retirada na academia).
  vendaOnline: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  // JPEG em data URL, reduzido no navegador (mesma ideia da foto do aluno) — usado na loja.
  foto: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

module.exports = Produto;
