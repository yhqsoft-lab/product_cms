// controllers/FccController.js
const fccService = require('../services/fccService');

const handleError = (res, err, fallbackMessage = '服务器内部错误') => {
  if (err.isOperational) {
    const body = { message: err.message };
    if (err.code) body.code = err.code;
    return res.status(err.statusCode).json(body);
  }
  console.error(`[FccController Error] ${fallbackMessage}:`, err);
  return res.status(500).json({ message: fallbackMessage });
};

exports.getFccs = async (req, res) => {
  try {
    const results = await fccService.getFccs(req.query);
    res.status(200).json(results);
  } catch (err) {
    handleError(res, err, '服务器内部错误');
  }
};

exports.getProductsByFcc = async (req, res) => {
  try {
    const products = await fccService.getProductsByFcc(req.params.id);
    res.json(products);
  } catch (err) {
    handleError(res, err, '服务器错误');
  }
};

exports.addProductToFcc = async (req, res) => {
  try {
    await fccService.addProductToFcc(req.params.id, req.body.productId);
    res.status(201).json({ message: '产品已添加到 FCC' });
  } catch (err) {
    handleError(res, err, '服务器错误');
  }
};

exports.removeProductFromFcc = async (req, res) => {
  try {
    await fccService.removeProductFromFcc(req.params.id, req.params.productId);
    res.json({ message: '产品关联已删除' });
  } catch (err) {
    handleError(res, err, '服务器错误');
  }
};

exports.createFcc = async (req, res) => {
  try {
    const newFcc = await fccService.createFcc(req.body, req.file);
    res.status(201).json(newFcc);
  } catch (err) {
    handleError(res, err, '创建失败，请检查输入格式或稍后重试');
  }
};

exports.updateFcc = async (req, res) => {
  try {
    const fcc = await fccService.updateFcc(req.params.id, req.body, req.file);
    res.json(fcc);
  } catch (err) {
    handleError(res, err, '更新失败，请检查输入');
  }
};

exports.deleteFcc = async (req, res) => {
  try {
    await fccService.deleteFcc(req.params.id);
    res.json({ message: '删除成功' });
  } catch (err) {
    handleError(res, err, '删除失败，请重试');
  }
};
