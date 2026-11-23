//routes/ProductRoutes.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const ProductController = require('../controllers/productController');
const { authMiddleware } = require('../middleware/authMiddleware');

const ProductUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'manual', maxCount: 1 }
]);



// ✅ 公开：获取产品列表（product catalog）
router.get('/', ProductController.getProducts);

// 🔒 受保护：创建产品（需要登录）
router.post('/', ProductUpload, authMiddleware, ProductController.createProduct);

// 🔒 受保护：更新产品
router.put('/:id', ProductUpload, authMiddleware, ProductController.updateProduct);

// 🔒 受保护：删除产品
router.delete('/:id', authMiddleware, ProductController.deleteProduct);

// ✅ 公开：获取产品关联关系（兼容/替代）—— 关键修复！
router.get('/:id/relations', ProductController.getProductRelations);

// 🔒 受保护：设置产品关联关系
router.put('/:id/relations', authMiddleware, ProductController.setProductRelations);

// 👇 添加唯一性检查路由
router.get('/check-unique', ProductController.checkUnique);
module.exports = router;
