// routes/FccRoutes.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const FccController = require('../controllers/FccController');

// ✅ 修复关键：使用 .single() 将文件挂载到 req.file，与控制器的读取逻辑匹配
const fccUpload = upload.single('image');

// 🔧 Multer 错误拦截中间件（防止上传失败时返回丑陋的 500 错误）
const handleMulterError = (err, req, res, next) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: '文件大小不能超过 5MB' });
    }
    if (err.message.includes('仅允许')) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(400).json({ message: `上传错误: ${err.message}` });
  }
  next();
};

// 📦 1. 关联产品管理路由（必须在 /:id 之前定义）
router.route('/:id/products')
  .get(FccController.getProductsByFcc)
  .post(FccController.addProductToFcc);

router.delete('/:id/products/:productId', FccController.removeProductFromFcc);

// 📝 2. 单个 FCC 管理
router.route('/:id')
  .put(fccUpload, handleMulterError, FccController.updateFcc)  // 加上错误拦截
  .delete(FccController.deleteFcc);

// 📋 3. 列表获取 + 创建
router.route('/')
  .get(FccController.getFccs)
  .post(fccUpload, handleMulterError, FccController.createFcc); // 加上错误拦截

module.exports = router;
