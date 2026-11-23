// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const { User } = require('../models');

if (!process.env.JWT_SECRET) {
  throw new Error('❌ 环境变量 JWT_SECRET 未配置');
}

const getRefreshSecret = () =>
  process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET}_refresh`;

// ================= 主认证中间件 =================
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '未提供认证令牌' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: '认证令牌格式错误' });
    }

    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('🔥 JWT 验证错误:', err.message);
    }

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: '认证令牌已过期', code: 'TOKEN_EXPIRED' });
    }
    if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
      return res.status(401).json({ success: false, message: '无效的认证令牌', code: 'TOKEN_INVALID' });
    }
    return res.status(401).json({ success: false, message: '认证失败', code: 'AUTH_ERROR' });
  }
};

// ================= 通用角色权限中间件 =================
const requireRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user?.role) {
    return res.status(401).json({ success: false, message: '未认证或角色信息缺失' });
  }
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: '权限不足' });
  }
  next();
};

const adminMiddleware = requireRoles('admin');
const editorMiddleware = requireRoles('admin', 'editor');

// ================= 刷新令牌中间件 =================
const refreshTokenMiddleware = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: '刷新令牌不能为空' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, getRefreshSecret());
    } catch (tokenError) {
      if (tokenError.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: '刷新令牌已过期', code: 'REFRESH_EXPIRED' });
      }
      return res.status(401).json({ success: false, message: '无效的刷新令牌', code: 'REFRESH_INVALID' });
    }

    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'isActive', 'refreshToken']
    });

    if (!user) return res.status(401).json({ success: false, message: '用户不存在' });
    if (!user.isActive) return res.status(403).json({ success: false, message: '账号已被禁用' });

    // 修复：登出后 user.refreshToken 为 null，也必须拒绝刷新
    if (!user.refreshToken || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: '刷新令牌已失效，请重新登录' });
    }

    req.userId = user.id;
    next();
  } catch (error) {
    console.error('🔥 刷新令牌中间件错误:', error.message);
    res.status(500).json({ success: false, message: '刷新令牌验证失败' });
  }
};

// ================= 会话活动检测（性能优化版） =================
const checkActivityMiddleware = async (req, res, next) => {
  try {
    if (!req.user?.id) return next();
    const userId = req.user.id;

    const user = await User.findByPk(userId, { attributes: ['lastActivity'] });
    const now = new Date();

    if (user?.lastActivity) {
      const diffMin = (now - new Date(user.lastActivity)) / 60000;

      // 5 分钟内活跃过，跳过写库
      if (diffMin < 5) {
        return next();
      }

      // 超过 30 分钟无活动，附加警告标记
      if (diffMin > 30) {
        req.sessionWarning = { warning: true, minutesInactive: Math.floor(diffMin) };
      }
    }

    await User.update({ lastActivity: now }, { where: { id: userId } });
    next();
  } catch (error) {
    console.error('⚠️ 活动状态更新失败:', error.message);
    next();
  }
};

// 占位限流器（建议安装 npm i express-rate-limit 后替换）
const rateLimitMiddleware = (req, res, next) => next();

module.exports = {
  authMiddleware,
  requireRoles,
  adminMiddleware,
  editorMiddleware,
  refreshTokenMiddleware,
  checkActivityMiddleware,
  rateLimitMiddleware
};
