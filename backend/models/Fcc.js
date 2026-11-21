
// models/Fcc.model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

module.exports = (sequelize, DataTypes) => {
const Fcc = sequelize.define('Fcc', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  brand: {
    type: DataTypes.STRING,
    allowNull: true,
      field: 'brand' // 数据库字段名是 `brand`
  },
  productType: {
    type: DataTypes.STRING,
    allowNull: true,
    field:'productType'
  },
  speed: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true
  },
  replacement: {
    type: DataTypes.STRING,
    allowNull: true
  }
},
{
  // 可选配置项
  tableName: 'fccs',     // 强制表名复数形式（默认会自动复数化）
  timestamps: true       // 是否启用 createdAt / updatedAt 时间戳
});

// ✅ 多对多关联
Fcc.associate = (models) => {
  Fcc.belongsToMany(models.Product, {
    through: 'fcc_products', // 中间表名
    foreignKey: 'fccId',      // 当前模型的外键
    otherKey: 'productId'     // 目标模型的外键

  });
};

// 可选：同步模型到数据库（开发阶段可用）
//Fcc.sync({ alter: true }).then(() => console.log("Fcc 表已同步"));

return Fcc;
};
