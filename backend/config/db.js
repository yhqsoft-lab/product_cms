const { Sequelize } = require('sequelize');
require('dotenv').config();

if (process.env.USE_REAL_DB !== 'true') {
  const { sequelize } = require('../models/mockDb');
  module.exports = sequelize;
} else {
  const sequelize = new Sequelize({
    dialect: 'mysql',
    host: process.env.DB_HOST,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });
  sequelize.authenticate()
    .then(() => console.log('✅ Sequelize 连接成功'))
    .catch(err => console.error('❌ Sequelize 连接失败:', err));
  module.exports = sequelize;
}
