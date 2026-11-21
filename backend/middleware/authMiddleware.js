// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const { User } = require('../models');

// ✅ 启动时校验关键环境变量（防止运行时报错）
if (!process.env.JWT_SECRET) {
  throw new Error('❌ 环境变量 JWT_SECRET 未配置');
}

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

    // ✅ 验证 Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // 仅附加 payload，不查库
    next();
  } catch (err) {
    // 🚫 移除生产环境的 token 打印日志
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

// ================= 权限检查中间件 =================
const adminMiddleware = (req, res, next) => {
  if (!req.user?.role) {
    return res.status(401).json({ success: false, message: '未认证或角色信息缺失' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '需要管理员权限' });
  }
  next();
};

const editorMiddleware = (req, res, next) => {
  if (!req.user?.role) {
    return res.status(401).json({ success: false, message: '未认证或角色信息缺失' });
  }
  const allowedRoles = ['admin', 'editor'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: '权限不足' });
  }
  next();
};

// ================= 刷新令牌中间件 =================
const refreshTokenMiddleware = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: '刷新令牌不能为空' });
    }

    // ✅ 必须使用独立环境变量，禁止字符串拼接
    const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET 未配置');
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, refreshSecret);
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
    if (user.refreshToken && user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: '刷新令牌不匹配（可能已失效或被盗用）' });
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

    // 🛑 仅在超过 5 分钟未活动时才写库，避免高频 DB 写入
    const user = await User.findByPk(userId, { attributes: ['lastActivity'] });
    const now = new Date();

    if (user?.lastActivity) {
      const last = new Date(user.lastActivity);
      const diffMin = (now - last) / 60000;
      if (diffMin < 5) {
        // 更新会话警告（不阻塞请求）
        if (diffMin > 30) {
          req.sessionWarning = { warning: true, minutesInactive: Math.floor(diffMin) };
        }
        return next();
      }
    }

    // 超过 5 分钟或首次记录，更新活动时间
    await User.update({ lastActivity: now }, { where: { id: userId } });
    next();
  } catch (error) {
    // 记录日志但不中断请求
    console.error('⚠️ 活动状态更新失败:', error.message);
    next();
  }
};

// ================= 限流中间件（推荐使用 express-rate-limit） =================
// const rateLimit = require('express-rate-limit');
// const loginLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 50,
//   message: { success: false, message: '请求过于频繁，请稍后再试' }
// });

const rateLimitMiddleware = (req, res, next) => next(); // 临时占位，建议替换为上述库

module.exports = {
  authMiddleware,
  adminMiddleware,
  editorMiddleware,
  refreshTokenMiddleware,
  checkActivityMiddleware,
  rateLimitMiddleware
};
