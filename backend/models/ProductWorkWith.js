// models/ProductWorkWith.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const ProductWorkWith = sequelize.define('ProductWorkWith', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      }
    },
    relatedProductId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      }
    },
    // ✅ 新增字段：关系类型
    relationType: {
      type: DataTypes.ENUM(
        'compatible',      // 兼容
        'substitute',      // 替代
        'accessory',       // 配件
        'requires',        // 必需搭配
        'upgrade',         // 升级
        'downgrade'        // 降级
      ),
      defaultValue: 'compatible',
      allowNull: false
    },
    // ✅ 新增字段：方向
    direction: {
      type: DataTypes.ENUM('unidirectional', 'bidirectional'),
      defaultValue: 'unidirectional'
    },
    // ✅ 新增字段：置信度/优先级
    confidence: {
      type: DataTypes.FLOAT,
      defaultValue: 1.0,
      validate: {
        min: 0,
        max: 1
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'product_work_with',
    timestamps: true,
    updatedAt: true,  // 如果需要更新时间，可以设置为true
    indexes: [
      {
        unique: true,
        fields: ['productId', 'relatedProductId', 'relationType']
      },
      {
        fields: ['productId']
      },
      {
        fields: ['relatedProductId']
      },
      {
        fields: ['relationType']
      }
    ]
  });

  return ProductWorkWith;
};
