const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Onde o dinheiro está: caixa da recepção, conta no banco, saldo do Mercado Pago... O saldo é
// calculado (saldo inicial + entradas − saídas ± transferências), nunca gravado.
const ContaFinanceira = sequelize.define('ContaFinanceira', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tipo: {
    type: DataTypes.ENUM('caixa', 'banco', 'mercadopago', 'outro'),
    allowNull: false,
    defaultValue: 'banco',
  },
  // Null = conta da academia toda (não de uma unidade só).
  unidadeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  saldoInicial: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  dataSaldoInicial: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  // Formas de pagamento que caem nesta conta por padrão ("pix,cartao") — usado nos lançamentos
  // automáticos (ex.: mensalidade paga em dinheiro entra no caixa; por Pix, no Mercado Pago).
  formasPadrao: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
});

module.exports = ContaFinanceira;
