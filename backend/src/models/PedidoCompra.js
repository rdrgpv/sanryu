const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// situacao: P (pendente, padrão) -> X (encomendado, via "marcar como encomendado") -> PG (pago,
// via "marcar como pago", só a partir de X) -> R (recebido, automático quando todo item é
// totalmente recebido — pode acontecer a partir de P, X ou PG) | E (cancelado, manual antes de R).
const PedidoCompra = sequelize.define('PedidoCompra', {
  fornecedorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  dataPedido: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  situacao: {
    type: DataTypes.ENUM('P', 'X', 'PG', 'R', 'E'),
    allowNull: false,
    defaultValue: 'P',
  },
  valorTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  dataPrevistaEntrega: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dataRecebimento: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  dataEncomenda: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  dataPagamento: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  observacao: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

module.exports = PedidoCompra;
