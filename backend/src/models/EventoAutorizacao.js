const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Autorização do responsável preenchida (e assinada no celular) pela página pública avulsa do
// evento — não é ligada a uma inscrição (EventoAluno), só ao evento.
const EventoAutorizacao = sequelize.define('EventoAutorizacao', {
  eventoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  nomeAluno: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  faixa: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  idade: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  nomeResponsavel: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // PNG em data URL (data:image/png;base64,...) desenhado no canvas da página pública.
  assinatura: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
  },
  // Cópia do texto do termo no momento da assinatura — se o texto padrão mudar depois, a
  // autorização continua registrando exatamente o que o responsável aceitou.
  termo: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  ip: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = EventoAutorizacao;
