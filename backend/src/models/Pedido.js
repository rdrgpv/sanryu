const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Cliente é texto livre (sem vínculo com Aluno) — igual ao sistema de referência, que também não
// tem uma entidade Cliente. valorProdutos/valorPersonalizacoes/valorTotal são sempre recalculados
// no servidor a partir das linhas persistidas (nunca confia no total que o cliente mandar).
// situacao: P (pendente, padrão) -> C (compra solicitada, automático na Fase 3) -> F (finalizado/
// entregue, só via ação "entregar") | E (cancelado, manual a qualquer momento antes de F).
const Pedido = sequelize.define('Pedido', {
  nomeCliente: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  telefoneCliente: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  emailCliente: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dataPedido: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  situacao: {
    type: DataTypes.ENUM('P', 'C', 'F', 'E'),
    allowNull: false,
    defaultValue: 'P',
  },
  valorProdutos: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  valorPersonalizacoes: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  valorDesconto: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
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
  dataEntrega: {
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

module.exports = Pedido;
