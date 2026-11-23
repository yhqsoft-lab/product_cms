// models/Fcc.js
module.exports = (sequelize, DataTypes) => {
  const Fcc = sequelize.define(
    'Fcc',
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      brand: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'brand'
      },
      productType: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'productType'
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
      tableName: 'fccs',
      timestamps: true
    }
  );

  Fcc.associate = (models) => {
    Fcc.belongsToMany(models.Product, {
      through: 'fcc_products',
      foreignKey: 'fccId',
      otherKey: 'productId'
    });
  };

  return Fcc;
};
