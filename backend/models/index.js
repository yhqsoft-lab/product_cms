// models/index.js
const path = require('path');
const fs = require('fs');
const { Sequelize, DataTypes } = require('sequelize');

require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'your_database',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    dialectModule: require('mysql2'),
    logging:
      process.env.NODE_ENV === 'development'
        ? (msg) => console.log(`[Sequelize] ${msg}`)
        : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true
    },
    timezone: '+08:00'
  }
);

const db = {};

// 自动加载当前目录下所有模型文件
fs.readdirSync(__dirname)
  .filter((file) => file !== 'index.js' && file.endsWith('.js'))
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, DataTypes);
    db[model.name] = model;
  });

// 统一建立模型关联
Object.keys(db).forEach((modelName) => {
  if (db[modelName] && typeof db[modelName].associate === 'function') {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    process.exit(1);
  }
};

// 安全同步：默认不修改/不清空已有表结构（变更表结构建议走 SQL 或 Migration）
const syncDatabase = async () => {
  try {
    await sequelize.sync({ force: false, alter: false });
    console.log('✅ 数据库模型校验完成');
  } catch (error) {
    console.error('❌ 数据库同步失败:', error);
  }
};

const initializeDatabase = async () => {
  await testConnection();
  await syncDatabase();
};

if (require.main === module) {
  initializeDatabase();
}

module.exports = db;
