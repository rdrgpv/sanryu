const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Contrato = matrícula do aluno num plano. Os valores (plano, descontos, final) são gravados no
// momento da matrícula — mudar o preço do plano depois não altera contratos existentes. A turma em
// que o aluno treina continua na tabela Matricula (aluno↔turma), que é outra coisa.
const Contrato = sequelize.define('Contrato', {
  alunoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  planoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  dataInicio: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  dataFim: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  diaVencimento: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 28 },
  },
  situacao: {
    type: DataTypes.ENUM('ativo', 'encerrado', 'cancelado'),
    allowNull: false,
    defaultValue: 'ativo',
  },

  valorPlano: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  // % aplicado automaticamente quando o responsável já tem outro aluno com contrato ativo.
  descontoFamiliaPercentual: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0,
  },
  // Bolsa manual (0–100; 100 = isento), sempre com motivo.
  bolsaPercentual: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0,
  },
  motivoBolsa: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  valorFinal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  observacoes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // Código do link público de assinatura (/contratos/:token) — aleatório, não dá pra adivinhar.
  tokenAssinatura: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
  },
  assinatura: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
  nomeAssinante: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Texto do contrato já com os dados preenchidos, congelado no momento da assinatura.
  termoAssinado: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
  assinadoEm: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  // "link" (responsável no celular) ou "recepcao" (assinado na tela do admin).
  assinadoVia: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  ipAssinatura: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = Contrato;
