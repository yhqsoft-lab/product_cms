// controllers/ProductController.js
const { Op } = require('sequelize');
const fs = require('fs/promises');
const path = require('path');
const { Product } = require('../models');
const { sequelize } = require('../models');

// 获取所有产品（支持模糊搜索）
exports.getProducts = async (req, res) => {
  const { search } = req.query;

  try {
    const where = {};
    if (search) {
      where[Op.or] = [
        { model: { [Op.like]: `%${search}%` } },
  //      { productType: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } },
  //      { brand: { [Op.like]: `%${search}%` } },
  //      { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const products = await Product.findAll({
      where,
      limit: 50, // 👈 紧急修复：加上硬限制！每次最多只返回 50 条记录
      include: [
        {
          model: Product,
          as: 'compatibleProducts',
          attributes: ['id'],
          through: { attributes: [] }
        },
        {
          model: Product,
          as: 'upgradeProducts',
          attributes: ['id'],
          through: { attributes: [] }
        },
        {
          model: Product,
          as: 'replacementProducts',
          attributes: ['id'],
          through: { attributes: [] }
        }
      ],
      order: [['id', 'DESC']]
    });

    const formattedProducts = products.map(p => {
      const plain = p.get({ plain: true });
      return {
        ...plain,
        compatibleIds: plain.compatibleProducts?.map(cp => cp.id) || [],
        upgradeIds: plain.upgradeProducts?.map(cp => cp.id) || [],
        replacementIds: plain.replacementProducts?.map(rp => rp.id) || []
      };
    });

    res.status(200).json(formattedProducts);
  } catch (err) {
    console.error('获取产品列表失败:', err);
    res.status(500).json({ message: '服务器内部错误' });
  }
};

// 创建新产品
exports.createProduct = async (req, res) => {
  try {
    const {
     sku,
     model,
     description = '',
     brand = '',
     productType = '',
     httpLink = '',
     status = 'active'
   } = req.body;

       // 🔍 检查 SKU 是否已存在
       const existingSku = await Product.findOne({ where: { sku } });
       if (existingSku) {
         return res.status(400).json({
           success: false,
           message: 'SKU 已存在，请使用其他 SKU'
         });
       }

       // 🔍 检查 Model 是否已存在
       const existingModel = await Product.findOne({ where: { model } });
       if (existingModel) {
         return res.status(400).json({
           success: false,
           message: '型号（Model）已存在，请使用其他型号'
         });
       }

    let imagePath = null;
    let manualPath = null;

    // ✅ 修改：使用 upload.fields() 后，req.files 是一个对象
    if (req.files) {
      // 处理图片文件
      if (req.files.image && req.files.image[0]) {
        const imageFile = req.files.image[0];
        // 文件已经由 multer 保存，只需要获取路径
        imagePath = `/uploads/${imageFile.filename}`;
      }

      // 处理 PDF 文件
      if (req.files.manual && req.files.manual[0]) {
        const manualFile = req.files.manual[0];
        manualPath = `/uploads/${manualFile.filename}`;
      }
    }

    const newProduct = await Product.create({
      sku,
      model,
      description,
      brand,
      productType,
      httpLink,
      status,
      manual: manualPath,
      image: imagePath
    });

    res.status(201).json(newProduct);
  } catch (err) {
    console.error('创建产品失败:', err.message);
    res.status(400).json({ message: err.message });
  }
};

// 更新产品
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: '未找到该产品' });
    }

    const { id } = req.params;
    const {
      sku,
      model,
      description = '',
      brand = '',
      productType = '',
      httpLink = ''
    } = req.body;

    // 安全处理 status 字段
    const statusValue = req.body.status !== undefined ? req.body.status : 'active';

    // 🔍 检查 SKU（排除自身）
    if (sku !== undefined && sku !== '') {
      const existingSku = await Product.findOne({
        where: {
          sku,
          id: { [Op.ne]: id }
        }
      });
      if (existingSku) {
        return res.status(400).json({
          success: false,
          message: 'SKU 已存在，请使用其他 SKU'
        });
      }
    }

    // 🔍 检查 Model（排除自身）
    if (model !== undefined && model !== '') {
      const existingModel = await Product.findOne({
        where: {
          model,
          id: { [Op.ne]: id }
        }
      });
      if (existingModel) {
        return res.status(400).json({
          success: false,
          message: '型号（Model）已存在，请使用其他型号'
        });
      }
    }

    // 👇 关键：动态处理文件路径
    let imagePath = product.image;
    let manualPath = product.manual;

    // 处理图片
    if (req.files?.image?.[0]) {
      imagePath = `/uploads/${req.files.image[0].filename}`;
    } else if (req.body.image !== undefined && req.body.image === null) {
      imagePath = null;
    }

    // 处理说明书
    if (req.files?.manual?.[0]) {
      manualPath = `/uploads/${req.files.manual[0].filename}`;
    } else if (req.body.manual !== undefined && req.body.manual === null) {
      manualPath = null;
    }

    // 👇 安全删除旧文件
    const isValidPath = (p) =>
      p && p.startsWith('/uploads/') && !p.includes('..');

    try {
      if (imagePath !== product.image && product.image && isValidPath(product.image)) {
        await fs.unlink(`public${product.image}`);
      }
      if (manualPath !== product.manual && product.manual && isValidPath(product.manual)) {
        await fs.unlink(`public${product.manual}`);
      }
    } catch (err) {
      console.warn('删除旧文件失败:', err.message);
    }

    // 执行更新
    await product.update({
      sku,
      model,
      description,
      brand,
      productType,
      httpLink,
      status: statusValue,
      image: imagePath,
      manual: manualPath
    });

    res.json(product);
  } catch (err) {
    console.error('更新产品失败:', err);
    res.status(500).json({ message: err.message || '服务器内部错误' });
  }
};
// 删除产品
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: '未找到该产品' });
    }

    try {
      if (product.image) {
        const filePath = `public${product.image}`;
        await fs.access(filePath);
        await fs.unlink(filePath);
      }
      if (product.manual) {
        const filePath = `public${product.manual}`;
        await fs.access(filePath);
        await fs.unlink(filePath);
      }
    } catch (err) {
      console.error('删除文件失败:', err);
    }

    await product.destroy();
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('删除失败:', err);
    res.status(500).json({ message: '删除失败，请重试' });
  }
};

// 获取产品的所有关联产品
exports.getProductRelations = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: '产品不存在' });
    }

    const [compatible, upgrade, replacement] = await Promise.all([
      product.getCompatibleProducts(),
      product.getUpgradeProducts(),
      product.getReplacementProducts()
    ]);

    // ✅ 修复：添加 "data" 键名
    res.json({
      success: true,
      data: {
        compatible: compatible.map(p => p.toJSON()),
        upgrade: upgrade.map(p => p.toJSON()),
        replacement: replacement.map(p => p.toJSON())
      }
    });
  } catch (err) {
    console.error('获取关系失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
};
// 设置产品关系（全量替换）
exports.setProductRelations = async (req, res) => {
  const { id } = req.params;
  const { compatible = [], upgrade = [], replacement = [] } = req.body;

  try {
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: '产品不存在' });
    }

    const allIds = [...compatible, ...upgrade, ...replacement];
    if (allIds.some(pid => {
      const num = Number(pid);
      return isNaN(num) || !Number.isInteger(num) || num <= 0;
    })) {
      return res.status(400).json({ message: '无效的产品ID' });
    }

    await sequelize.transaction(async (t) => {
      await sequelize.query(
        `DELETE FROM product_relations
         WHERE source_product_id = ?
         AND relation_type IN ('compatible','upgrade', 'replacement')`,
        { replacements: [id], transaction: t }
      );

      const relations = [];
      for (const targetId of compatible) {
        if (targetId !== Number(id)) {
          relations.push([id, targetId, 'compatible']);
        }
      }
      for (const targetId of upgrade) {
        if (targetId !== Number(id)) {
          relations.push([id, targetId, 'upgrade']);
        }
      }
      for (const targetId of replacement) {
        if (targetId !== Number(id)) {
          relations.push([id, targetId, 'replacement']);
        }
      }

      // ✅ 修复 SQL 语法
      if (relations.length > 0) {
        const placeholders = relations.map(() => '(?, ?, ?)').join(', ');
        const flatValues = relations.flat();

        await sequelize.query(
          `INSERT INTO product_relations
           (source_product_id, target_product_id, relation_type)
           VALUES ${placeholders}`,
          { replacements: flatValues, transaction: t }
        );
      }
    });

    res.json({ success: true, message: '关系更新成功' });
  } catch (err) {
    console.error('设置关系失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 检查 SKU/Model 唯一性
exports.checkUnique = async (req, res) => {
  try {
    const { sku, model, excludeId } = req.query;

    if (!sku && !model) {
      return res.status(400).json({
        success: false,
        message: '必须提供 sku 或 model 参数'
      });
    }

    let exists = false;

    if (sku) {
      const where = { sku };
      if (excludeId) where.id = { [Op.ne]: excludeId };
      exists = await Product.findOne({ where });
    } else if (model) {
      const where = { model };
      if (excludeId) where.id = { [Op.ne]: excludeId };
      exists = await Product.findOne({ where });
    }

    res.json({
      success: true,
      unique: !exists
    });
  } catch (err) {
    console.error('检查唯一性失败:', err);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};
