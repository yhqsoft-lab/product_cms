// controllers/FccController.js
const { Op } = require('sequelize');
const { Fcc, Product } = require('../models');
const path = require('path');
const fs = require('fs').promises;

// 获取所有 FCC（支持模糊搜索）
exports.getFccs = async (req, res) => {
  const { search } = req.query;
  try {
    const whereClause = search ? {
      [Op.or]: [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ]
    } : {};

    const results = await Fcc.findAll({
      where: whereClause,
      order: [['id', 'DESC']]
    });
    res.status(200).json(results);
  } catch (err) {
    console.error('❌ 搜索FCC失败:', err);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

// 获取 FCC 关联的所有产品
exports.getProductsByFcc = async (req, res) => {
  const { id } = req.params;
  try {
    const fcc = await Fcc.findByPk(id, {
      include: [{ model: Product, as: 'Products', through: { attributes: [] } }]
    });
    if (!fcc) return res.status(404).json({ message: 'FCC 未找到' });
    res.json(fcc.Products);
  } catch (err) {
    console.error('❌ 获取关联产品失败:', err);
    res.status(500).json({ message: '服务器错误', error: err.message });
  }
};

// 添加关联产品到 FCC
exports.addProductToFcc = async (req, res) => {
  const { id } = req.params;
  const { productId } = req.body;
  try {
    if (!id || !productId) {
      return res.status(400).json({ message: '缺少必要参数' });
    }

    const fcc = await Fcc.findByPk(id);
    if (!fcc) return res.status(404).json({ message: 'FCC 未找到' });

    const product = await Product.findByPk(productId);
    if (!product) return res.status(404).json({ message: '产品未找到' });

    const alreadyAssociated = await fcc.hasProduct(product);
    if (alreadyAssociated) {
      return res.status(400).json({ message: '产品已关联到此 FCC', code: 'ALREADY_ASSOCIATED' });
    }

    await fcc.addProduct(product);
    res.status(201).json({ message: '产品已添加到 FCC' });
  } catch (err) {
    console.error('❌ 添加产品失败:', err);
    res.status(500).json({ message: '服务器错误', error: err.message });
  }
};

// 删除产品关联
exports.removeProductFromFcc = async (req, res) => {
  const { id, productId } = req.params;
  try {
    const fcc = await Fcc.findByPk(id);
    if (!fcc) return res.status(404).json({ message: 'FCC 未找到' });

    const product = await Product.findByPk(productId);
    if (!product) return res.status(404).json({ message: '产品未找到' });

    await fcc.removeProduct(product);
    res.json({ message: '产品关联已删除' });
  } catch (err) {
    console.error('❌ 删除产品关联失败:', err);
    res.status(500).json({ message: '服务器错误', error: err.message });
  }
};

// 创建新 FCC
exports.createFcc = async (req, res) => {
  try {
    const { name, description, brand, productType, speed } = req.body;

    // ✅ 对齐前端：description 改为可选，仅校验核心必填项
    if (!name || !brand) {
      return res.status(400).json({ message: '缺少必要字段 (name, brand)' });
    }

    // ✅ 兼容 req.file (需配合路由改为 .single('image'))
    const uploadedFile = req.file;
    const imagePath = uploadedFile ? `/uploads/${uploadedFile.filename}` : null;

    const newFcc = await Fcc.create({
      name: name.trim(),
      description: description?.trim() || null,
      brand,
      productType,
      speed,
      image: imagePath
    });

    res.status(201).json(newFcc);
  } catch (err) {
    // 🗑️ 数据库写入失败时，清理已上传的图片文件
    if (req.file) {
      fs.unlink(req.file.path).catch(() => {});
    }
    console.error('❌ 创建FCC失败:', err);
    // ✅ 安全：不暴露底层 DB 错误详情
    res.status(400).json({ message: '创建失败，请检查输入格式或稍后重试' });
  }
};

// 更新 FCC
exports.updateFcc = async (req, res) => {
  try {
    const fcc = await Fcc.findByPk(req.params.id);
    if (!fcc) return res.status(404).json({ message: '未找到该记录' });

    const { name, description, brand, productType, speed } = req.body;
    let imagePath = fcc.image;

    if (req.file) {
      // 🗑️ 清理旧图片（仅当旧路径合法且存在时）
      if (fcc.image && fcc.image.startsWith('/uploads/')) {
        const oldPath = path.resolve(__dirname, `../public${fcc.image}`);
        try {
          await fs.unlink(oldPath);
        } catch (e) {
          console.warn('⚠️ 旧图片清理失败:', e.message);
        }
      }
      imagePath = `/uploads/${req.file.filename}`;
    }

    await fcc.update({
      name: name?.trim() ?? fcc.name,
      description: description?.trim() ?? fcc.description,
      brand: brand ?? fcc.brand,
      productType: productType ?? fcc.productType,
      speed: speed ?? fcc.speed,
      image: imagePath
    });

    res.json(fcc);
  } catch (err) {
    if (req.file) fs.unlink(req.file.path).catch(() => {});
    console.error('❌ 更新FCC失败:', err);
    res.status(400).json({ message: '更新失败，请检查输入' });
  }
};

// 删除 FCC
exports.deleteFcc = async (req, res) => {
  try {
    const fcc = await Fcc.findByPk(req.params.id);
    if (!fcc) return res.status(404).json({ message: '未找到该记录' });

    // 🗑️ 安全删除关联图片
    if (fcc.image && fcc.image.startsWith('/uploads/')) {
      const filePath = path.resolve(__dirname, `../public${fcc.image}`);
      try {
        await fs.unlink(filePath);
      } catch (e) {
        console.warn('⚠️ 图片文件不存在或权限不足，跳过删除:', e.message);
      }
    }

    await fcc.destroy();
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('❌ 删除FCC失败:', err);
    res.status(500).json({ message: '删除失败，请重试' });
  }
};
