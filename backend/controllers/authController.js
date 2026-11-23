// controllers/authController.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ✅ 从 models/index.js 导入 User 模型
const { User } = require('../models');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-local-jwt-secret';

// 用户登录
exports.login = async (req, res) => {
  try {
    console.log('🔍 收到登录请求:', req.body);

    const { username, password } = req.body;

    // 验证输入
    if (!username || !password) {
      console.log('❌ 用户名或密码为空');
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    console.log('🔍 查询用户:', username);

    // 检查 User 模型是否已正确加载
    if (!User || typeof User.findOne !== 'function') {
      console.error('🔥 User 模型未正确初始化');
      return res.status(500).json({
        success: false,
        message: '服务器配置错误'
      });
    }

    // 查找用户（包括密码字段）
    const user = await User.findOne({
      where: { username },
      attributes: ['id', 'username', 'password', 'role', 'email', 'isActive']
    });

    console.log('🔍 查询结果:', user ? `找到用户 ID: ${user.id}` : '用户不存在');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 检查用户是否激活
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: '账号已被禁用'
      });
    }

    console.log('🔍 验证密码...');

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('🔍 密码验证结果:', isMatch);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 生成 JWT Token（短期令牌，24小时）
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        loginTime: Date.now() // 记录登录时间，用于超时检测
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 生成 Refresh Token（长期令牌，7天）
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET || JWT_SECRET + '_refresh',
      { expiresIn: '7d' } // 7天过期
    );

    // 更新用户最后活动时间和刷新令牌（可选）
    try {
      await User.update(
        {
          lastActivity: new Date(),
          refreshToken
        },
        { where: { id: user.id } }
      );
    } catch (updateError) {
      console.warn('⚠️ 更新用户活动时间失败:', updateError.message);
      // 不影响主要登录流程
    }

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }
    });

  } catch (err) {
    console.error('🔥 登录错误详情:', err);
    console.error('🔥 错误消息:', err.message);
    console.error('🔥 错误堆栈:', err.stack);

    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// 用户注册
exports.register = async (req, res) => {
  try {
    console.log('🔍 收到注册请求:', req.body);

    const { username, password, confirmPassword, email } = req.body;

    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    // 验证两次密码是否一致
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: '两次输入的密码不一致'
      });
    }

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '用户名已存在'
      });
    }

    // 检查邮箱是否已存在（如果提供了邮箱）
    if (email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: '邮箱已被注册'
        });
      }
    }

    // 加密密码
    console.log('🔍 加密密码...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建新用户
    console.log('🔍 创建用户...');
    const newUser = await User.create({
      username,
      password: hashedPassword,
      email: email || null,
      role: 'user', // 默认用户角色
      isActive: true,
      lastActivity: new Date()
    });

    const token = jwt.sign(
      {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        loginTime: Date.now()
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 生成 Refresh Token
    const refreshToken = jwt.sign(
      { id: newUser.id },
      process.env.JWT_REFRESH_SECRET || JWT_SECRET + '_refresh',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        token,
        refreshToken,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role
        }
      }
    });

  } catch (err) {
    console.error('🔥 注册错误:', err);
    res.status(500).json({
      success: false,
      message: '注册失败',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// 刷新访问令牌
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: '刷新令牌不能为空'
      });
    }

    console.log('🔍 刷新令牌请求...');

    // 验证刷新令牌
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || JWT_SECRET + '_refresh'
    );

    // 查找用户并验证刷新令牌
    const user = await User.findOne({
      where: {
        id: decoded.id,
        isActive: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在或已被禁用'
      });
    }

    // 可选：检查刷新令牌是否与存储的一致
    if (user.refreshToken && user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: '无效的刷新令牌'
      });
    }

    // 检查最后活动时间（可选安全措施）
    if (user.lastActivity) {
      const lastActivity = new Date(user.lastActivity);
      const now = new Date();
      const daysDiff = (now - lastActivity) / (1000 * 60 * 60 * 24);

      // 如果超过30天无活动，要求重新登录
      if (daysDiff > 30) {
        return res.status(401).json({
          success: false,
          message: '会话已过期，请重新登录'
        });
      }
    }

    // 生成新的访问令牌
    const newToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        loginTime: Date.now()
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 可选：更新最后活动时间
    await User.update(
      { lastActivity: new Date() },
      { where: { id: user.id } }
    );

    res.json({
      success: true,
      message: '令牌刷新成功',
      data: {
        token: newToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }
    });

  } catch (err) {
    console.error('🔥 刷新令牌错误:', err);

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '刷新令牌已过期，请重新登录'
      });
    }

    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '无效的刷新令牌'
      });
    }

    res.status(500).json({
      success: false,
      message: '令牌刷新失败'
    });
  }
};

// 心跳检测 - 更新用户最后活动时间
exports.heartbeat = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('❤️ 心跳请求来自用户:', userId);

    // 更新用户最后活动时间
    await User.update(
      { lastActivity: new Date() },
      { where: { id: userId } }
    );

    res.json({
      success: true,
      message: '活动已记录',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('🔥 心跳请求失败:', error);
    res.status(500).json({
      success: false,
      message: '心跳请求失败'
    });
  }
};

// 获取当前用户信息
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password', 'refreshToken'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          lastActivity: user.lastActivity,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });

  } catch (err) {
    console.error('🔥 获取用户信息错误:', err);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
};

// 用户登出
exports.logout = async (req, res) => {
  try {
    const userId = req.user.id;

    // 清除用户的刷新令牌（可选）
    await User.update(
      { refreshToken: null },
      { where: { id: userId } }
    );

    console.log('👋 用户登出:', userId);

    res.json({
      success: true,
      message: '登出成功'
    });

  } catch (err) {
    console.error('🔥 登出错误:', err);
    res.status(500).json({
      success: false,
      message: '登出失败'
    });
  }
};

// 检查用户名是否可用
exports.checkUsername = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: '请提供用户名'
      });
    }

    const existingUser = await User.findOne({ where: { username } });

    res.json({
      success: true,
      data: {
        available: !existingUser
      }
    });

  } catch (err) {
    console.error('🔥 检查用户名失败:', err);
    res.status(500).json({
      success: false,
      message: '检查用户名失败'
    });
  }
};

// 更新用户信息
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { email, currentPassword, newPassword } = req.body;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 更新邮箱
    if (email && email !== user.email) {
      // 检查邮箱是否已被使用
      const existingEmail = await User.findOne({
        where: { email },
        attributes: ['id']
      });

      if (existingEmail && existingEmail.id !== userId) {
        return res.status(400).json({
          success: false,
          message: '邮箱已被其他用户使用'
        });
      }

      user.email = email;
    }

    // 更新密码（如果提供了当前密码和新密码）
    if (currentPassword && newPassword) {
      // 验证当前密码
      const isMatch = await bcrypt.compare(currentPassword, user.password);

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: '当前密码不正确'
        });
      }

      // 加密新密码
      user.password = await bcrypt.hash(newPassword, 10);
    } else if (newPassword && !currentPassword) {
      // 如果没有提供当前密码
      return res.status(400).json({
        success: false,
        message: '需要提供当前密码才能修改密码'
      });
    }

    await user.save();

    // 返回更新后的用户信息（排除敏感字段）
    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password', 'refreshToken'] }
    });

    res.json({
      success: true,
      message: '个人信息更新成功',
      data: {
        user: updatedUser
      }
    });

  } catch (err) {
    console.error('🔥 更新个人信息失败:', err);
    res.status(500).json({
      success: false,
      message: '更新个人信息失败'
    });
  }
};

// 初始化管理员用户（开发用）
exports.initAdmin = async (req, res) => {
  try {
    // 只在开发环境允许
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: '此功能仅在开发环境可用'
      });
    }

    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    // 检查是否已存在管理员
    const existingAdmin = await User.findOne({ where: { username } });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: '用户已存在'
      });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建管理员用户
    const adminUser = await User.create({
      username,
      password: hashedPassword,
      email: email || 'admin@example.com',
      role: 'admin',
      isActive: true,
      lastActivity: new Date()
    });

    console.log('✅ 管理员用户创建成功:', username);

    res.status(201).json({
      success: true,
      message: '管理员用户创建成功',
      data: {
        user: {
          id: adminUser.id,
          username: adminUser.username,
          email: adminUser.email,
          role: adminUser.role
        }
      }
    });

  } catch (err) {
    console.error('🔥 初始化管理员失败:', err);
    res.status(500).json({
      success: false,
      message: '初始化管理员失败'
    });
  }
};

// 检查会话状态
exports.checkSession = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'lastActivity']
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 检查最后活动时间
    let sessionStatus = 'active';
    let minutesSinceLastActivity = 0;

    if (user.lastActivity) {
      const lastActivity = new Date(user.lastActivity);
      const now = new Date();
      minutesSinceLastActivity = Math.floor((now - lastActivity) / (1000 * 60));

      if (minutesSinceLastActivity > 30) {
        sessionStatus = 'expired';
      } else if (minutesSinceLastActivity > 25) {
        sessionStatus = 'warning';
      }
    }

    res.json({
      success: true,
      data: {
        sessionStatus,
        minutesSinceLastActivity,
        user: {
          id: user.id,
          username: user.username,
          lastActivity: user.lastActivity
        }
      }
    });

  } catch (err) {
    console.error('🔥 检查会话状态失败:', err);
    res.status(500).json({
      success: false,
      message: '检查会话状态失败'
    });
  }
};
