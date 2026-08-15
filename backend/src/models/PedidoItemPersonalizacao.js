const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PedidoItemPersonalizacao = sequelize.define('PedidoItemPersonalizacao', {
  pedidoItemId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  tipoPersonalizacaoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  textoPersonalizado: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Texto livre, sem FK pra Cor — a cor da personalização (linha/bordado) é independente do
  // cadastro de cores de produto.
  corPersonalizacao: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  posicao: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  valor: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  observacao: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = PedidoItemPersonalizacao;
