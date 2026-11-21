// backend/app.js
const express = require('express');
const app = express();
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
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
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ✅ CORS 配置
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ✅ JSON 解析（必须在所有路由之前，但不会影响 Multer 路由）
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ✅ 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

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

// ✅ 根路径信息
app.get('/', (req, res) => {
  res.json({
    message: 'API 服务运行中',
    version: '1.0.0',
    endpoints: {
      products: '/api/products',
      fccs: '/api/fccs',
      auth: '/api/auth',
      health: '/health'
    }
  });
});

// ✅ API 路由（Multer 将在 ProductRoutes 内部按需使用）
app.use('/api/fccs', FccRoutes);
app.use('/api/auth', LoginRoutes);
app.use('/api/products', ProductRoutes); // 文件上传逻辑在此路由内部处理

// ✅ 404 处理
app.use((req, res) => {
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

// ✅ 服务器启动逻辑（保持不变）
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

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 服务运行在 http://localhost:${PORT}`);
      console.log(`📁 静态文件目录: ${path.join(__dirname, 'public/uploads')}`);
      console.log(`🌐 API 地址: http://localhost:${PORT}/api`);
      console.log(`🔧 健康检查: http://localhost:${PORT}/health`);
      console.log(`🔌 FCC 管理: http://localhost:${PORT}/api/fccs`);
      console.log(`📦 产品管理: http://localhost:${PORT}/api/products`);
    });
  } catch (error) {
    console.error('❌ 启动失败:', error.message);
    process.exit(1);
  }
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
