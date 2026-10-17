const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const STATUS_LEAD = ['novo', 'agendado', 'compareceu', 'matriculado', 'desistiu'];

// Interessado (aula experimental): o funil antes de virar aluno. Entra pelo formulário público ou
// cadastrado pelo admin; "matriculado" quando é convertido em Aluno (alunoId).
const Lead = sequelize.define('Lead', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  telefone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: { isEmail: true },
  },
  dataNascimento: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  // Preenchido quando a aula é pra uma criança (quem agendou é o responsável).
  nomeResponsavel: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  turmaId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  unidadeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  dataAula: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM(...STATUS_LEAD),
    allowNull: false,
    defaultValue: 'novo',
  },
  // Como conheceu (Instagram, indicação...) — pra saber o que traz aluno.
  origem: {
    type: DataTypes.STRING(40),
    allowNull: true,
  },
  observacoes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  motivoDesistencia: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  alunoId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  lembreteEnviadoEm: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

Lead.beforeValidate((lead) => {
  if (lead.email === '') lead.email = null;
  if (lead.email) lead.email = lead.email.trim().toLowerCase();
});

Lead.STATUS = STATUS_LEAD;

module.exports = Lead;
