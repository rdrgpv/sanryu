const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Pagamento agrupado: vários pedidos de compra do mesmo fornecedor pagos de uma vez só (um boleto,
// um Pix). Vira UMA conta a pagar no financeiro (origem "pagamentoCompra") no lugar das contas de
// cada pedido; dar baixa nela marca todos os pedidos como pagos. Ver services/pagamentoCompraService.js.
const PagamentoCompra = sequelize.define('PagamentoCompra', {
  fornecedorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  // AAAA-MM-DD — vencimento da conta a pagar.
  vencimento: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  observacao: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
});

module.exports = PagamentoCompra;
