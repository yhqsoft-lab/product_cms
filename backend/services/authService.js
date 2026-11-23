// services/authService.js
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const AppError = require('../utils/AppError');

const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const getJwtSecrets = () => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('🔥 JWT_SECRET 未设置');
    throw new AppError('服务器配置错误', 500);
  }
  const refreshSecret = process.env.JWT_REFRESH_SECRET || `${jwtSecret}_refresh`;
  return { jwtSecret, refreshSecret };
};

const generateTokens = (user) => {
  const { jwtSecret, refreshSecret } = getJwtSecrets();

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      loginTime: Date.now()
    },
    jwtSecret,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    refreshSecret,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );

  return { token, refreshToken };
};

const formatBasicUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role
});

/**
 * 用户登录
 */
exports.login = async ({ username, password }) => {
  if (!username || !password) {
    throw new AppError('用户名和密码不能为空', 400);
  }

  const user = await User.findOne({
    where: { username },
    attributes: ['id', 'username', 'password', 'role', 'email', 'isActive']
  });

  if (!user) {
    throw new AppError('用户名或密码错误', 401);
  }

  if (user.isActive === false) {
    throw new AppError('账号已被禁用', 403);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('用户名或密码错误', 401);
  }

  const { token, refreshToken } = generateTokens(user);

  await User.update(
    { lastActivity: new Date(), refreshToken },
    { where: { id: user.id } }
  );

  return {
    token,
    refreshToken,
    user: formatBasicUser(user)
  };
};

/**
 * 用户注册
 */
exports.register = async ({ username, password, confirmPassword, email }) => {
  if (!username || !password) {
    throw new AppError('用户名和密码不能为空', 400);
  }

  if (password !== confirmPassword) {
    throw new AppError('两次输入的密码不一致', 400);
  }

  const existingUser = await User.findOne({ where: { username }, attributes: ['id'] });
  if (existingUser) {
    throw new AppError('用户名已存在', 400);
  }

  if (email) {
    const existingEmail = await User.findOne({ where: { email }, attributes: ['id'] });
    if (existingEmail) {
      throw new AppError('邮箱已被注册', 400);
    }
  }

  // 直接传明文密码，由 User.beforeCreate 钩子自动加密
  const newUser = await User.create({
    username,
    password,
    email: email || null,
    role: 'user',
    isActive: true,
    lastActivity: new Date()
  });

  const { token, refreshToken } = generateTokens(newUser);

  // 注册后同步保存 refreshToken
  await User.update({ refreshToken }, { where: { id: newUser.id } });

  return {
    token,
    refreshToken,
    user: formatBasicUser(newUser)
  };
};

/**
 * 刷新访问令牌
 */
exports.refreshToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new AppError('刷新令牌不能为空', 400);
  }

  const { jwtSecret, refreshSecret } = getJwtSecrets();

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, refreshSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('刷新令牌已过期，请重新登录', 401);
    }
    throw new AppError('无效的刷新令牌', 401);
  }

  const user = await User.findOne({
    where: { id: decoded.id, isActive: true }
  });

  if (!user) {
    throw new AppError('用户不存在或已被禁用', 401);
  }

  if (!user.refreshToken || user.refreshToken !== refreshToken) {
    throw new AppError('无效的刷新令牌', 401);
  }

  if (user.lastActivity) {
    const daysDiff = (Date.now() - new Date(user.lastActivity).getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 30) {
      throw new AppError('会话已过期，请重新登录', 401);
    }
  }

  const newToken = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      loginTime: Date.now()
    },
    jwtSecret,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );

  await User.update(
    { lastActivity: new Date() },
    { where: { id: user.id } }
  );

  return {
    token: newToken,
    user: formatBasicUser(user)
  };
};

/**
 * 心跳检测
 */
exports.heartbeat = async (userId) => {
  await User.update(
    { lastActivity: new Date() },
    { where: { id: userId } }
  );
  return new Date().toISOString();
};

/**
 * 获取当前用户信息
 */
exports.getCurrentUser = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: { exclude: ['password', 'refreshToken'] }
  });

  if (!user) {
    throw new AppError('用户不存在', 404);
  }

  return user;
};

/**
 * 用户登出
 */
exports.logout = async (userId) => {
  await User.update(
    { refreshToken: null },
    { where: { id: userId } }
  );
};

/**
 * 检查用户名是否可用
 */
exports.checkUsername = async (username) => {
  if (!username) {
    throw new AppError('请提供用户名', 400);
  }

  const existingUser = await User.findOne({ where: { username }, attributes: ['id'] });
  return !existingUser;
};

/**
 * 更新个人信息
 */
exports.updateProfile = async (userId, { email, currentPassword, newPassword }) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('用户不存在', 404);
  }

  if (email && email !== user.email) {
    const existingEmail = await User.findOne({
      where: { email },
      attributes: ['id']
    });
    if (existingEmail && existingEmail.id !== userId) {
      throw new AppError('邮箱已被其他用户使用', 400);
    }
    user.email = email;
  }

  if (newPassword) {
    if (!currentPassword) {
      throw new AppError('需要提供当前密码才能修改密码', 400);
    }
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError('当前密码不正确', 400);
    }
    // 直接赋值明文，由 User.beforeUpdate 钩子自动加密
    user.password = newPassword;
  }

  await user.save();

  return User.findByPk(userId, {
    attributes: { exclude: ['password', 'refreshToken'] }
  });
};

/**
 * 初始化管理员（仅开发环境）
 */
exports.initAdmin = async ({ username, password, email }) => {
  if (process.env.NODE_ENV !== 'development') {
    throw new AppError('此功能仅在开发环境可用', 403);
  }

  if (!username || !password) {
    throw new AppError('用户名和密码不能为空', 400);
  }

  const existingAdmin = await User.findOne({ where: { username }, attributes: ['id'] });
  if (existingAdmin) {
    throw new AppError('用户已存在', 400);
  }

  const adminUser = await User.create({
    username,
    password,
    email: email || 'admin@example.com',
    role: 'admin',
    isActive: true,
    lastActivity: new Date()
  });

  return formatBasicUser(adminUser);
};

/**
 * 检查会话状态
 */
exports.checkSession = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'username', 'lastActivity']
  });

  if (!user) {
    throw new AppError('用户不存在', 401);
  }

  let sessionStatus = 'active';
  let minutesSinceLastActivity = 0;

  if (user.lastActivity) {
    minutesSinceLastActivity = Math.floor(
      (Date.now() - new Date(user.lastActivity).getTime()) / (1000 * 60)
    );

    if (minutesSinceLastActivity > 30) {
      sessionStatus = 'expired';
    } else if (minutesSinceLastActivity > 25) {
      sessionStatus = 'warning';
    }
  }

  return {
    sessionStatus,
    minutesSinceLastActivity,
    user: {
      id: user.id,
      username: user.username,
      lastActivity: user.lastActivity
    }
  };
};
