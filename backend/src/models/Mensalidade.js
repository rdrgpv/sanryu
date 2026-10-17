const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Uma cobrança de um contrato (mensal, ou trimestral/semestral/anual conforme o plano). "Vencida"
// não é um status gravado: é pendente com vencimento no passado — calculado na hora.
const Mensalidade = sequelize.define(
  'Mensalidade',
  {
    contratoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    alunoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    // Mês de referência ("2026-11") — junto com o contrato, impede gerar a mesma cobrança duas vezes.
    competencia: {
      type: DataTypes.STRING(7),
      allowNull: false,
    },
    vencimento: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    // Valor do contrato na data de geração, sem multa/juros (esses são calculados no pagamento).
    valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pendente', 'pago', 'cancelado'),
      allowNull: false,
      defaultValue: 'pendente',
    },

    valorPago: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    pagoEm: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // pix (baixa automática) | dinheiro | cartao | transferencia | outro (baixa manual no admin).
    formaPagamento: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Link público de pagamento (/mensalidades/:token).
    token: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },

    // Pix atual — gerado sob demanda quando a pessoa abre o link, já com multa/juros do dia.
    mpPaymentId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    qrcodePix: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    pixCopiaCola: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    pixValor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    pixExpiraEm: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // Controle dos e-mails automáticos, pra não mandar o mesmo aviso duas vezes.
    emailCobrancaEm: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    emailVencimentoEm: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    emailAtrasoEm: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    indexes: [{ unique: true, fields: ['contratoId', 'competencia'] }],
  }
);

module.exports = Mensalidade;
