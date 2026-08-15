const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Junção de alocação venda<->compra: quanto de um PedidoItem (linha de venda) uma PedidoCompraItem
// (linha de compra) cobre. Sem constraint de unicidade — uma linha de venda pode ganhar vários
// vínculos ao longo de múltiplas gerações de pedido de compra (fornecedores diferentes, lotes
// parciais etc.).
const PedidoItemCompra = sequelize.define('PedidoItemCompra', {
  pedidoItemId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  pedidoCompraItemId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  quantidade: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 },
  },
});

module.exports = PedidoItemCompra;
