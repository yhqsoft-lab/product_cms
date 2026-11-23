// backend/app.js
require('dotenv').config(); // 必须放在最顶部，确保后续模块能读到环境变量

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
const path = require('path');

const { sequelize } = require('./models');
const FccRoutes = require('./routes/FccRoutes');
const ProductRoutes = require('./routes/ProductRoutes');
const LoginRoutes = require('./routes/authRoutes');

const app = express();

// 1. 基础安全与日志中间件
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// 2. CORS 配置
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// 3. 请求体解析
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

// 4. 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// 5. 健康检查与根路径
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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

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

// 6. 业务路由
app.use('/api/fccs', FccRoutes);
app.use('/api/auth', LoginRoutes);
app.use('/api/products', ProductRoutes);

// 7. 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '请求的资源不存在',
    path: req.path,
    method: req.method
  });
});

// 8. 全局错误处理
app.use((err, req, res, next) => {
  // Multer 上传错误
  if (err instanceof multer.MulterError) {
    const multerMessages = {
      LIMIT_FILE_SIZE: { message: '文件大小超出限制', error: 'FILE_SIZE_LIMIT_EXCEEDED' },
      LIMIT_UNEXPECTED_FILE: { message: '文件字段名不正确', error: 'INVALID_FIELD_NAME' }
    };
    const info = multerMessages[err.code] || { message: '文件上传失败', error: 'UPLOAD_FAILED' };
    return res.status(400).json({ success: false, ...info });
  }

  // 自定义文件类型错误
  if (err.message?.includes('PDF') || err.message?.includes('图片')) {
    return res.status(400).json({
      success: false,
      message: err.message,
      error: 'INVALID_FILE_TYPE'
    });
  }

  // 自定义业务错误（AppError）
  if (err.isOperational) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message
    });
  }

  // 未预期系统错误
  console.error('🔥 服务器错误:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  const statusCode = err.statusCode || err.status || 500;
  const response = {
    success: false,
    message: statusCode === 500 && process.env.NODE_ENV === 'production'
      ? '服务器内部错误'
      : (err.message || '服务器内部错误')
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
});

// 9. 启动与优雅停机
let server;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    await sequelize.sync({ force: false, alter: false });
    console.log('✅ 数据库模型校验完成');

    const PORT = process.env.PORT || 5000;
    server = app.listen(PORT, () => {
      console.log(`🚀 服务运行在 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ 启动失败:', error.message);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  console.log(`收到 ${signal} 信号，正在关闭服务器...`);
  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      console.log('✅ HTTP 服务已停止接收新请求');
    }
    await sequelize.close();
    console.log('✅ 数据库连接已关闭');
    process.exit(0);
  } catch (err) {
    console.error('❌ 关闭服务时出错:', err.message);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();
module.exports = app;
