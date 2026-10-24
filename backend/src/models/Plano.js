const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Quantos meses cada periodicidade cobre — usado pra exibir o valor mensal equivalente e, na etapa
// de mensalidades, pra saber de quanto em quanto tempo gerar a cobrança.
const MESES_POR_PERIODICIDADE = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 };

const Plano = sequelize.define('Plano', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  descricao: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  periodicidade: {
    type: DataTypes.ENUM(...Object.keys(MESES_POR_PERIODICIDADE)),
    allowNull: false,
    defaultValue: 'mensal',
  },
  // Valor cobrado a cada período (ex.: o trimestral guarda o valor do trimestre inteiro).
  valor: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  // Null = plano vale pra todas as unidades.
  unidadeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  // Aparece na página "Planos" do site (planos internos, como bolsista, ficam desmarcados).
  exibirNoSite: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
});

Plano.MESES_POR_PERIODICIDADE = MESES_POR_PERIODICIDADE;

module.exports = Plano;
