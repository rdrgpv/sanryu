const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Fornecedor = sequelize.define('Fornecedor', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  cnpjCpf: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  telefone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Dias que o fornecedor costuma levar pra entregar; preenche a previsão de entrega do pedido de
  // compra quando ele é gerado.
  prazoEntregaDias: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

module.exports = Fornecedor;
