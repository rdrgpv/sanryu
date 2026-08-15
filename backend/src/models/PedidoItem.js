const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PedidoItem = sequelize.define('PedidoItem', {
  pedidoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  produtoVariacaoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  quantidade: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 },
  },
  valorUnitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  valorTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  observacao: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = PedidoItem;
