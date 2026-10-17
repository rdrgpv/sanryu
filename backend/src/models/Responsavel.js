const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Responsável financeiro/legal — um cadastro só pra vários alunos (irmãos), pra não repetir os
// dados e permitir cobrar a família numa cobrança só. O parentesco fica no Aluno, porque a mesma
// pessoa pode ser mãe de um e avó de outro.
const Responsavel = sequelize.define('Responsavel', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  cpf: {
    type: DataTypes.STRING(14),
    allowNull: true,
  },
  telefone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
  observacoes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
});

Responsavel.beforeValidate((responsavel) => {
  if (responsavel.email === '') responsavel.email = null;
  if (responsavel.email) responsavel.email = responsavel.email.trim().toLowerCase();
});

module.exports = Responsavel;
