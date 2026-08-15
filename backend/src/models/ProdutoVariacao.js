const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// "codigo" é gerado pelo servidor (VAR-000001, a partir do id real) e imutável — nunca é
// aceito do cliente. "quantidadeEstoque" também nunca é gravado direto: só muda via
// EstoqueMovimentacao (ver estoqueService.aplicarMovimento).
const ProdutoVariacao = sequelize.define('ProdutoVariacao', {
  produtoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  corId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  tamanhoId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  codigo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  valorCusto: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  valorVenda: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  quantidadeEstoque: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

module.exports = ProdutoVariacao;
