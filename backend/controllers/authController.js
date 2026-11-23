// controllers/authController.js
const authService = require('../services/authService');

const handleError = (res, err, fallbackMessage = '服务器内部错误') => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      message: err.errors?.[0]?.message || '请求数据不合法或已存在'
    });
  }
  console.error(`[AuthController Error] ${fallbackMessage}:`, err);
  return res.status(500).json({
    success: false,
    message: fallbackMessage,
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

exports.login = async (req, res) => {
  try {
    const data = await authService.login(req.body);
    res.json({ success: true, message: '登录成功', data });
  } catch (err) {
    handleError(res, err, '服务器内部错误');
  }
};

exports.register = async (req, res) => {
  try {
    const data = await authService.register(req.body);
    res.status(201).json({ success: true, message: '注册成功', data });
  } catch (err) {
    handleError(res, err, '注册失败');
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const data = await authService.refreshToken(req.body.refreshToken);
    res.json({ success: true, message: '令牌刷新成功', data });
  } catch (err) {
    handleError(res, err, '令牌刷新失败');
  }
};

exports.heartbeat = async (req, res) => {
  try {
    const timestamp = await authService.heartbeat(req.user.id);
    res.json({ success: true, message: '活动已记录', timestamp });
  } catch (err) {
    handleError(res, err, '心跳请求失败');
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    res.json({ success: true, data: { user } });
  } catch (err) {
    handleError(res, err, '获取用户信息失败');
  }
};

exports.logout = async (req, res) => {
  try {
    await authService.logout(req.user.id);
    res.json({ success: true, message: '登出成功' });
  } catch (err) {
    handleError(res, err, '登出失败');
  }
};

exports.checkUsername = async (req, res) => {
  try {
    const available = await authService.checkUsername(req.query.username);
    res.json({ success: true, data: { available } });
  } catch (err) {
    handleError(res, err, '检查用户名失败');
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await authService.updateProfile(req.user.id, req.body);
    res.json({ success: true, message: '个人信息更新成功', data: { user } });
  } catch (err) {
    handleError(res, err, '更新个人信息失败');
  }
};

exports.initAdmin = async (req, res) => {
  try {
    const user = await authService.initAdmin(req.body);
    res.status(201).json({ success: true, message: '管理员用户创建成功', data: { user } });
  } catch (err) {
    handleError(res, err, '初始化管理员失败');
  }
};

exports.checkSession = async (req, res) => {
  try {
    const data = await authService.checkSession(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    handleError(res, err, '检查会话状态失败');
  }
};
