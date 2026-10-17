const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Conta a pagar (despesa) ou a receber (receita). Pendente = em aberto; pago = realizado (entra no
// fluxo de caixa e no saldo da conta). Lançamentos automáticos têm "origem" (mensalidade, venda da
// loja, pedido de compra, recorrência) e são mantidos pelo financeiroService.sincronizarOrigens.
const Lancamento = sequelize.define(
  'Lancamento',
  {
    tipo: {
      type: DataTypes.ENUM('receita', 'despesa'),
      allowNull: false,
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
    valor: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    vencimento: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pendente', 'pago', 'cancelado'),
      allowNull: false,
      defaultValue: 'pendente',
    },
    dataPagamento: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    valorPago: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    formaPagamento: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    contaFinanceiraId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // manual | mensalidade | pedido (venda da loja) | pedidoCompra | recorrencia
    origem: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'manual',
    },
    origemId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    // Recorrência: mês de referência ("2026-11"), pra gerar uma vez só por mês.
    competencia: {
      type: DataTypes.STRING(7),
      allowNull: true,
    },
  },
  {
    // Busca por origem. Não é único de propósito: NULL não conta como repetido em índice único
    // (MySQL/SQLite), então não garantiria nada pros sem competência — a unicidade "um por origem"
    // fica no financeiroService (sincronização roda uma de cada vez).
    indexes: [{ fields: ['origem', 'origemId'] }],
  }
);

module.exports = Lancamento;
