const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PUBLICOS = ['todos', 'unidade', 'turma', 'inadimplentes', 'evento'];

// Comunicado em massa: e-mail pra um público (alunos ativos do dojo, uma unidade, uma turma, quem
// está com mensalidade atrasada ou os inscritos de um evento) e/ou aviso na área do aluno.
const Aviso = sequelize.define('Aviso', {
  titulo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  mensagem: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  publico: {
    type: DataTypes.ENUM(...PUBLICOS),
    allowNull: false,
  },
  // Id da unidade/turma/evento, conforme o público (null em "todos" e "inadimplentes").
  alvoId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // Texto do público na hora do envio ("Turma Kids"), pra lista continuar legível se o alvo mudar.
  descricaoPublico: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  enviarEmail: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  mostrarNoPortal: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  status: {
    type: DataTypes.ENUM('enviando', 'concluido'),
    allowNull: false,
    defaultValue: 'concluido',
  },
  totalDestinatarios: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  enviados: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  falhas: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  criadoPorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
});

Aviso.PUBLICOS = PUBLICOS;

module.exports = Aviso;
