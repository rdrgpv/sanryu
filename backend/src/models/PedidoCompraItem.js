const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PedidoCompraItem = sequelize.define('PedidoCompraItem', {
  pedidoCompraId: {
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
  quantidadeRecebida: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  // Copiado do valorCusto da variação no momento da geração — não segue o custo futuro da
  // variação (ver pedidoCompraService.gerarPedidoCompra).
  valorUnitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  valorTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
});

module.exports = PedidoCompraItem;
