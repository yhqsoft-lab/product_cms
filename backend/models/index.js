// models/index.js
const path = require('path');
const fs = require('fs');
const { Sequelize, DataTypes } = require('sequelize');

// ✅ 加载环境变量（只需一次）
require('dotenv').config();

// ✅ 创建 Sequelize 实例（统一连接）
const sequelize = new Sequelize(
  process.env.DB_NAME || 'your_database',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    dialectModule: require('mysql2'), // 使用 mysql2 驱动
    logging: process.env.NODE_ENV === 'development' ?
      (msg) => console.log(`[Sequelize] ${msg}`) :
      false,
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
    timezone: '+08:00' // 设置时区（如果需要）
  }
);

// ✅ 自动加载所有模型
const db = {};

// 读取当前目录下的所有 .js 文件（除了 index.js）
fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file !== 'index.js' &&
      file.slice(-3) === '.js' &&
      file !== 'ProductWorkWith.js' // 如果有特殊模型，单独处理
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, DataTypes);
    db[model.name] = model;
  });

// ✅ 手动添加 ProductWorkWith 模型（如果有的话）
try {
  const ProductWorkWithPath = path.join(__dirname, 'ProductWorkWith.js');
  if (fs.existsSync(ProductWorkWithPath)) {
    const ProductWorkWith = require(ProductWorkWithPath)(sequelize, DataTypes);
    db[ProductWorkWith.name] = ProductWorkWith;
  }
} catch (err) {
  console.log('ProductWorkWith 模型加载失败或不存在:', err.message);
}

// ✅ 建立模型关联
Object.keys(db).forEach(modelName => {
  if (db[modelName] && typeof db[modelName].associate === 'function') {
    db[modelName].associate(db);
  }
});

// ✅ 添加 sequelize 和 Sequelize 到 db 对象
db.sequelize = sequelize;
db.Sequelize = Sequelize;

// ✅ 测试数据库连接（可选）
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    // 检查表结构
    const tables = await sequelize.query('SHOW TABLES');
    console.log(`📊 数据库中的表: ${tables[0].map(t => Object.values(t)[0]).join(', ') || '无'}`);

  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    process.exit(1); // 连接失败时退出
  }
};

// ✅ 同步数据库（根据环境决定策略）
const syncDatabase = async () => {
  try {
    const syncOptions = process.env.NODE_ENV === 'production'
      ? { alter: true }  // 生产环境：修改表结构
      : { force: true }; // 开发环境：不强制重建

    await sequelize.sync(syncOptions);
    console.log('✅ 数据库模型同步完成');

  } catch (error) {
    console.error('❌ 数据库同步失败:', error);
  }
};

// ✅ 初始化数据库
const initializeDatabase = async () => {
  await testConnection();
  await syncDatabase();
};

// 如果是直接运行此文件，则初始化数据库
if (require.main === module) {
  initializeDatabase();
}

// ✅ 导出所有模型
module.exports = db;
