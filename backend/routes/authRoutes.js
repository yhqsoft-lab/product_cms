// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const {
  authMiddleware,
  adminMiddleware,
  refreshTokenMiddleware,
  checkActivityMiddleware
  // rateLimitMiddleware // ⚠️ 已废弃，替换为下方真实限流配置
} = require('../middleware/authMiddleware');

// 🛡️ 推荐：使用 express-rate-limit 实现真实限流
// npm install express-rate-limit
const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟窗口
  max: 20,                  // 每个IP最多20次请求
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '登录尝试过于频繁，请稍后再试' }
});

// 🔓 公开路由（无需认证）
router.post('/login', loginLimiter, authController.login);        // ✅ 启用真实限流
router.post('/register', authController.register);
router.post('/refresh', refreshTokenMiddleware, authController.refreshToken);
router.get('/check-username', authController.checkUsername);

// 🔐 需要认证的路由
router.post('/heartbeat', authMiddleware, checkActivityMiddleware, authController.heartbeat); // ✅ 挂载活动检测
router.get('/me', authMiddleware, checkActivityMiddleware, authController.getCurrentUser);    // ✅ 挂载活动检测
router.get('/session', authMiddleware, authController.checkSession);
router.put('/profile', authMiddleware, authController.updateProfile);
router.post('/logout', authMiddleware, authController.logout);

// 👑 管理员路由
// ⚠️ 移除 adminMiddleware：初始系统无 admin，由 Controller 内部校验是否允许创建
router.post('/init-admin', authController.initAdmin);

// 🩺 健康检查
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '认证服务正常',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;
