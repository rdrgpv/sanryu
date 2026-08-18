const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EventoAluno = sequelize.define('EventoAluno', {
  eventoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // "faixa" é a faixa de DESTINO (a que a pessoa vai fazer o exame); faixaAtual é a que ela já tem.
  faixa: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  faixaAtual: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Tamanho físico da faixa (ex.: A1) — só relevante em Exame de Faixa. Quando a origem é "gatame"
  // vem pronto da integração (campo tamanho_faixa); só é pedido manualmente pra quem não veio de lá.
  tamanhoFaixa: {
    type: DataTypes.CHAR(2),
    allowNull: true,
  },
  dataNascimento: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  telefone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  responsavel: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  numeroCarteirinha: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  validadeCarteirinha: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Null quando não se aplica (evento não é Exame de Faixa) — só true/false quando o valor foi
  // calculado com base em ter (ou não) carteirinha válida (número + validade em dia).
  carteirinhaValida: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  origemDados: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  apto: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  valorCobrado: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  statusPagamento: {
    type: DataTypes.ENUM('pendente', 'pago', 'expirado'),
    allowNull: false,
    defaultValue: 'pendente',
  },
  qrcodePix: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  pixCopiaCola: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  mpPaymentId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Marca que esse inscrito já foi cadastrado como aluno novo no Gatame (via
  // eventoController.cadastrarNoGatame) — evita tentar de novo e mostrar duplicado à toa.
  cadastradoNoGatame: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  // Aluno do Sanryu criado (ou já existente, reaproveitado pelo email) a partir desse inscrito, via
  // eventoController.cadastrarComoAluno — null enquanto não cadastrado por aqui.
  alunoId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
});

module.exports = EventoAluno;
