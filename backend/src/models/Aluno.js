const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Aluno = sequelize.define('Aluno', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  telefone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dataNascimento: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  faixaId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // Medida física da faixa (PP/P/M/G/GG) — enviada como tamanho_faixa ao cadastrar o aluno no
  // Gatame (ver alunoController.cadastrarNoGatame). Mesmas opções da inscrição pública de eventos.
  tamanhoFaixa: {
    type: DataTypes.CHAR(2),
    allowNull: true,
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  // Marca que esse aluno já foi cadastrado no Gatame a partir desta tela (ver
  // alunoController.cadastrarNoGatame) — evita tentar de novo à toa.
  cadastradoNoGatame: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
});

module.exports = Aluno;
