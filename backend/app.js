// backend/app.js
const express = require('express');
const app = express();
app.set('trust proxy', 1);
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// ✅ 从 models/index.js 导入数据库连接
const { sequelize } = require('./models');

// 导入路由
const FccRoutes = require('./routes/FccRoutes');
const ProductRoutes = require('./routes/ProductRoutes');
const LoginRoutes = require('./routes/authRoutes');

// ✅ 加载环境变量
require('dotenv').config();

// ✅ 安全中间件（注意顺序！）
app.use(morgan('dev'));
app.use(helmet({
  contentSecurityPolicy: false,
  frameguard: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ✅ CORS 配置
app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ✅ JSON 解析（必须在所有路由之前，但不会影响 Multer 路由）
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ✅ 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// ✅ 健康检查路由
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

// ✅ API 路由（Multer 将在 ProductRoutes 内部按需使用）
app.use('/api/fccs', FccRoutes);
app.use('/api/auth', LoginRoutes);
app.use('/api/products', ProductRoutes); // 文件上传逻辑在此路由内部处理

// ✅ API 未匹配路由返回 JSON 404
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: '请求的资源不存在',
    path: req.originalUrl,
    method: req.method
  });
});

// ✅ 前端 SPA 静态资源与回退路由（在 API 路由之后）
const frontendBuildPath = path.join(__dirname, '../react-demo/build');
const frontendIndexPath = path.join(frontendBuildPath, 'index.html');
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
}

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    if (fs.existsSync(frontendIndexPath)) {
      return res.sendFile(frontendIndexPath);
    }
  }
  res.status(404).json({
    success: false,
    message: '请求的资源不存在',
    path: req.path,
    method: req.method
  });
});

// ✅ 全局错误处理（必须放在所有路由之后）
app.use((err, req, res, next) => {
  // Multer 错误处理
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '文件大小不能超过 5MB',
        error: 'FILE_SIZE_LIMIT_EXCEEDED'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: '文件字段名不正确',
        error: 'INVALID_FIELD_NAME'
      });
    }
    return res.status(400).json({
      success: false,
      message: '文件上传失败',
      error: 'UPLOAD_FAILED'
    });
  }

  // 自定义文件类型错误
  if (err.message?.includes('PDF') || err.message?.includes('图片')) {
    return res.status(400).json({
      success: false,
      message: err.message,
      error: 'INVALID_FILE_TYPE'
    });
  }

  // 其他错误
  console.error('服务器错误:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  const statusCode = err.status || 500;
  const response = {
    success: false,
    message: err.message || '服务器内部错误'
  };

  if (process.env.NODE_ENV === 'development') {
    response.error = err.message;
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
});

// ✅ 服务器启动逻辑
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    const syncOptions = process.env.NODE_ENV === 'development'
      ? { force: false }
      : { alter: false };
    await sequelize.sync(syncOptions);
    console.log('✅ 数据库同步成功');

    const [tables] = await sequelize.query('SHOW TABLES');
    if (tables.length > 0) {
      console.log('📊 数据库中的表:');
      tables.forEach(table => {
        console.log(`   - ${Object.values(table)[0]}`);
      });
    }
  } catch (error) {
    console.warn('⚠️ 数据库初始化警告，继续启动服务:', error.message);
  }

  const PORT = 3000;
  const HOST = '0.0.0.0';
  app.listen(PORT, HOST, () => {
    console.log(`🚀 服务运行在 http://${HOST}:${PORT}`);
    console.log(`📁 静态文件目录: ${path.join(__dirname, 'public/uploads')}`);
    console.log(`🌐 API 地址: http://${HOST}:${PORT}/api`);
    console.log(`🔧 健康检查: http://${HOST}:${PORT}/health`);
    console.log(`🔌 FCC 管理: http://${HOST}:${PORT}/api/fccs`);
    console.log(`📦 产品管理: http://${HOST}:${PORT}/api/products`);
  });
};

// 优雅关闭
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
const shutdown = async (signal) => {
  console.log(`收到 ${signal} 信号，正在关闭服务器...`);
  try {
    await sequelize.close();
    console.log('✅ 数据库连接已关闭');
    process.exit(0);
  } catch (err) {
    console.error('❌ 关闭数据库时出错:', err.message);
    process.exit(1);
  }
};

startServer();
module.exports = app;
