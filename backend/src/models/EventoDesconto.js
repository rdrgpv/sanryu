const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Valor especial de inscrição pra uma pessoa num evento (ex.: pagou a carteirinha, mas ela não foi
// efetivada e o sistema cobraria o valor "sem carteirinha"). Vale pro e-mail informado — e pro nome,
// quando preenchido, pra separar irmãos que usam o mesmo e-mail. Se a pessoa já estava inscrita e
// ainda não pagou, o valor é trocado na hora (ver services/eventoDescontoService.js).
const EventoDesconto = sequelize.define('EventoDesconto', {
  eventoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Valor que essa pessoa paga (0 = isenta).
  valor: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  motivo: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Inscrição em que o valor especial foi aplicado (null = a pessoa ainda não se inscreveu).
  eventoAlunoId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // Carteirinha paga e ainda não feita: entra na lista "carteirinhas a enviar" até ser marcada.
  carteirinhaPendente: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  carteirinhaEnviadaEm: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

module.exports = EventoDesconto;
