// models/Product.js
module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    productType: {
      type: DataTypes.STRING,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: true
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // 👈 添加唯一约束
     validate: {
       notEmpty: true
     }
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // 👈 添加唯一约束
     validate: {
       notEmpty: true
     }
    },
    httpLink: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
     type: DataTypes.ENUM('active', 'discontinued', 'development'),
     allowNull: false,
     defaultValue: 'active'
   },

    manual: {
      type: DataTypes.STRING,
      allowNull: true
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'products',
    timestamps: true
  });

  // ✅ 多对多关联
  Product.associate = (models) => {
    Product.belongsToMany(models.Fcc, {
      through: 'fcc_products',
      foreignKey: 'productId',
      otherKey: 'fccId'
    });

    // 兼容关系（A 可配合 B）
  Product.belongsToMany(models.Product, {
    through: {
      model: 'product_relations',
      scope: { relation_type: 'compatible' } // 👈 关键！
    },
    as: 'compatibleProducts',
    foreignKey: 'source_product_id',
    otherKey: 'target_product_id',

  });

  //  A升级为B
  Product.belongsToMany(models.Product, {
    through: {
      model: 'product_relations',
      scope: { relation_type: 'upgrade' } // 👈 关键！
    },
    as: 'upgradeProducts',
    foreignKey: 'source_product_id',
    otherKey: 'target_product_id',

  });


  // 替代关系（A 可替代 B）
  Product.belongsToMany(models.Product, {
    through: {
      model: 'product_relations',
      scope: { relation_type: 'replacement' } // 👈 关键！
    },
    as: 'replacementProducts',
    foreignKey: 'source_product_id',
    otherKey: 'target_product_id',

  });

  // 被替代关系（B 被 A 替代）
  Product.belongsToMany(models.Product, {
    through: {
      model: 'product_relations',
      scope: { relation_type: 'replacement' } // 👈 注意：这里也应是 replacement
    },
    as: 'replacedBy', // 👈 修正拼写错误
    foreignKey: 'target_product_id',
    otherKey: 'source_product_id',

  });

  };

  return Product;
};
