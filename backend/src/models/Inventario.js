const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Contagem física do estoque. As diferenças viram movimentações (entrada "A" pra mais, saída "S"
// pra menos) com documentoOrigem "Inventário #id" — o registro guarda quem fez, quando e por quê.
const Inventario = sequelize.define('Inventario', {
  motivo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  itensContados: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  itensAjustados: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  // Soma das diferenças valorizadas pelo custo (negativo = perda).
  valorDiferenca: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  criadoPorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
});

module.exports = Inventario;
