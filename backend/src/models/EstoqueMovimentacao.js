const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Ledger de estoque: cada linha é um movimento (nunca alterado silenciosamente, ver
// estoqueMovimentacaoController). "E" e "A" somam a quantidadeEstoque da variação, "S" subtrai
// (ver estoqueService.delta) — quantidade aqui é sempre positiva, o sinal vem do tipo.
// pedidoCompraItemId/pedidoItemId marcam movimentos gerados pelo sistema (recebimento/entrega),
// que não podem ser editados/excluídos manualmente.
const EstoqueMovimentacao = sequelize.define('EstoqueMovimentacao', {
  produtoVariacaoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  dataMovimentacao: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  tipoMovimentacao: {
    type: DataTypes.ENUM('E', 'S', 'A'),
    allowNull: false,
  },
  quantidade: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 },
  },
  pedidoCompraItemId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  pedidoItemId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  documentoOrigem: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  observacao: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = EstoqueMovimentacao;
