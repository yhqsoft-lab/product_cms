// controllers/productController.js
const productService = require('../services/productService');

/**
 * 统一异常处理辅助函数（若已在 app.js 配置全局错误处理中间件，可直接改用 next(err)）
 */
const handleError = (res, err, fallbackMessage = '服务器内部错误') => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'SKU 或型号已存在，请勿重复提交'
    });
  }
  console.error(`[ProductController Error] ${fallbackMessage}:`, err);
  return res.status(500).json({
    success: false,
    message: fallbackMessage
  });
};


exports.getProducts = async (req, res) => {
  try {
    const { search, page, pageSize } = req.query;
    const result = await productService.getProducts({ search, page, pageSize });
    // 👇 改成直接返回数组，兼容现有所有前端页面（包括 ProductSearch 和新版 ProductRelationsManager）
    res.status(200).json(result.items);
  } catch (err) {
    handleError(res, err, '获取产品列表失败');
  }
};

exports.createProduct = async (req, res) => {
  try {
    const product = await productService.createProduct(req.body, req.files);
    res.status(201).json({
      success: true,
      data: product
    });
  } catch (err) {
    handleError(res, err, '创建产品失败');
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body, req.files);
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (err) {
    handleError(res, err, '更新产品失败');
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await productService.deleteProduct(req.params.id);
    res.status(200).json({
      success: true,
      message: '删除成功'
    });
  } catch (err) {
    handleError(res, err, '删除失败，请重试');
  }
};

exports.getProductRelations = async (req, res) => {
  try {
    const data = await productService.getProductRelations(req.params.id);
    res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    handleError(res, err, '获取产品关系失败');
  }
};

exports.setProductRelations = async (req, res) => {
  try {
    await productService.setProductRelations(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: '关系更新成功'
    });
  } catch (err) {
    handleError(res, err, '设置产品关系失败');
  }
};

exports.checkUnique = async (req, res) => {
  try {
    const unique = await productService.checkUnique(req.query);
    res.status(200).json({
      success: true,
      unique
    });
  } catch (err) {
    handleError(res, err, '检查唯一性失败');
  }
};
