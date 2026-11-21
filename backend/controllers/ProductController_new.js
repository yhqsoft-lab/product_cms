// controllers/ProductController.js
const { Op } = require('sequelize');
const fs = require('fs/promises');
const { Product } = require('../models');
const { sequelize } = require('../models');

// 获取所有产品（支持模糊搜索）
exports.getProducts = async (req, res) => {
  const { search } = req.query;

  try {
    // 构建查询条件
    const where = {};
    if (search) {
      where[Op.or] = [
        { model: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    // 查询产品并加载关联关系
    const products = await Product.findAll({
      where,
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

    // 转换为前端需要的格式
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
    const { model, description, brand, productType, httpLink } = req.body;

    if (!model || !brand || !productType) {
      return res.status(400).json({ message: '型号、品牌、产品类型为必填项' });
    }

    let imagePath = null;
    let manualPath = null;


    if (req.files?.image?.[0]) {
      imagePath = `/uploads/${req.files.image[0].filename}`;
    }

    if (req.files?.manual?.[0]) {
      manualPath = `/uploads/${req.files.manual[0].filename}`;
    }

    const newProduct = await Product.create({
      model,
      description,
      brand,
      productType,
      httpLink,
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

    const { model, description, brand, productType, httpLink } = req.body;

    let imagePath = product.image;
    let manualPath = product.manual;

    if (req.files?.image?.[0]) {
      imagePath = `/uploads/${req.files.image[0].filename}`;
    }

    if (req.files?.manual?.[0]) {
      manualPath = `/uploads/${req.files.manual[0].filename}`;
    }

    await product.update({
      model,
      description,
      brand,
      productType,
      httpLink,
      manual: manualPath,
      image: imagePath
    });

    res.json(product);
  } catch (err) {
    console.error('更新产品失败:', err);
    res.status(400).json({ message: err.message });
  }
};

// 删除产品
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: '未找到该产品' });
    }

    // 删除图片文件
    try {
      if (product.image) {
        const filePath = `public${product.image}`;
        await fs.access(filePath);
        await fs.unlink(filePath);
      }
    } catch (err) {
      console.error('删除图片失败:', err);
      // 不终止流程
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

    const [compatible,upgrade,replacement] = await Promise.all([
      product.getCompatibleProducts(),
      product.getUpgradeProducts(),
      product.getReplacementProducts()
    ]);

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
  const { compatible = [],upgrade = [], replacement = [] } = req.body;

  try {
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: '产品不存在' });
    }

    // 验证 ID 类型
    const allIds = [...compatible,...upgrade, ...replacement];
    if (allIds.some(pid => !Number.isInteger(pid) || pid <= 0)) {
      return res.status(400).json({ message: '无效的产品ID' });
    }

    // 使用事务确保一致性
    await sequelize.transaction(async (t) => {
      // 清除旧关系
      await sequelize.query(
        `DELETE FROM product_relations
         WHERE source_product_id = ?
         AND relation_type IN ('compatible','upgrade', 'replacement')`,
        { replacements: [id], transaction: t }
      );

      // 插入新关系
      const relations = [];

      // 兼容关系
      for (const targetId of compatible) {
        if (targetId !== Number(id)) {
          relations.push([id, targetId, 'compatible']);
        }
      }
      // 升级关系
      for (const targetId of upgrade) {
        if (targetId !== Number(id)) {
          relations.push([id, targetId, 'upgrade']);
        }
      }
      // 替代关系
      for (const targetId of replacement) {
        if (targetId !== Number(id)) {
          relations.push([id, targetId, 'replacement']);
        }
      }

  if (relations.length > 0) {
    await sequelize.query(
      `INSERT INTO product_relations
       (source_product_id, target_product_id, relation_type)
       VALUES ?`,
      {
        replacements: [relations], // ← 关键：直接传入二维数组
        transaction: t
      }
    );
  }
    });

    res.json({ success: true, message: '关系更新成功' });
  } catch (err) {
    console.error('设置关系失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
};
