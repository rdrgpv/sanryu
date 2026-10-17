const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Dinheiro mudando de conta (ex.: depósito do caixa no banco, saque do Mercado Pago). Não é
// receita nem despesa — só mexe no saldo das duas contas, sem aparecer no resultado do mês.
const Transferencia = sequelize.define('Transferencia', {
  contaOrigemId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  contaDestinoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  valor: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  data: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  descricao: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = Transferencia;
