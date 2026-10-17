const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Despesa (ou receita) fixa mensal — aluguel, salário, luz. Gera um Lancamento por mês (com
// origem "recorrencia"); se o valor de um mês variar, edita-se o lançamento daquele mês.
const Recorrencia = sequelize.define('Recorrencia', {
  tipo: {
    type: DataTypes.ENUM('receita', 'despesa'),
    allowNull: false,
    defaultValue: 'despesa',
  },
  descricao: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  categoriaId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  unidadeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  fornecedorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  contaFinanceiraId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  valor: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  diaVencimento: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 28 },
  },
  dataInicio: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  dataFim: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
});

module.exports = Recorrencia;
