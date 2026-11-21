// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { getCurrentUser } = require('../controllers/authController');
const { devAuth } = require('../middleware/authMiddleware'); // ✅ 引入

// ✅ 应用中间件：所有 /me 请求必须通过认证
router.get('/me', devAuth, getCurrentUser);


module.exports = router;
