const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Admin = sequelize.define('Admin', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // "admin" acessa tudo; "instrutor" (sensei) só a chamada das próprias turmas (rotas /api/sensei).
  // A tabela continua se chamando Admin por compatibilidade, mas guarda todos os logins.
  perfil: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'admin',
  },
  instrutorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
});

module.exports = Admin;
