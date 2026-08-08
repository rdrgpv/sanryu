const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = process.env.DB_HOST
  ? new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      logging: false,
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: path.join(__dirname, '..', '..', 'database.sqlite'),
      logging: false,
    });

module.exports = sequelize;
