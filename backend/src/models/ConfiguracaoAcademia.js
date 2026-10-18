const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Parâmetros da gestão da academia — linha única (criada nos ajustes iniciais). Fica fora da tabela
// Configuracao porque lá o valor é STRING(150), curto demais pro texto do contrato.
const ConfiguracaoAcademia = sequelize.define('ConfiguracaoAcademia', {
  descontoFamiliaPercentual: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0,
  },
  // Cobrança de mensalidades (ver services/mensalidadeService.js). Multa 2% (teto do CDC) + juros
  // de mora 1% a.m. (teto do Código Civil).
  multaPercentual: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 2,
  },
  jurosMensalPercentual: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 1,
  },
  // Quantos dias antes do vencimento a mensalidade é gerada e o e-mail de cobrança sai.
  diasAntecedenciaCobranca: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10,
  },
  // Emissor que aparece no recibo de pagamento (recibo simples, sem valor fiscal).
  reciboNome: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  reciboDocumento: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  reciboEndereco: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Marca que a migração "turmas antigas -> academias externas" já rodou (roda uma vez só, pra nunca
  // converter as turmas de verdade criadas depois). Ver config/ajustesIniciais.js.
  turmasMigradasEm: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  // Modelo do contrato com marcadores {{...}} (ver utils/termoContrato.js).
  termoContrato: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
  },
});

module.exports = ConfiguracaoAcademia;
