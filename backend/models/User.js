// models/User.js
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
          len: [3, 50]
        }
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isEmail: true
        }
      },
      role: {
        type: DataTypes.ENUM('admin', 'editor', 'user'),
        defaultValue: 'user',
        allowNull: false
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      refreshToken: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      lastActivity: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      tableName: 'users',
      timestamps: true,
      paranoid: false,
      indexes: [
        { unique: true, fields: ['username'] },
        { fields: ['email'] },
        { fields: ['role'] },
        { fields: ['lastActivity'] }
      ]
    }
  );

  // 统一在模型层处理密码哈希（Controller/Service 只需传入明文密码）
  User.beforeCreate(async (user) => {
    if (user.password) {
      user.password = await bcrypt.hash(user.password, 10);
    }
  });

  User.beforeUpdate(async (user) => {
    if (user.changed('password') && user.password) {
      user.password = await bcrypt.hash(user.password, 10);
    }
  });

  // 密码校验实例方法
  User.prototype.comparePassword = async function (plainPassword) {
    return bcrypt.compare(plainPassword, this.password);
  };

  return User;
};
