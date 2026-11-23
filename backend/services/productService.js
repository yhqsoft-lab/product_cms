// services/productService.js
const { Op } = require('sequelize');
const { Product, sequelize } = require('../models');
const AppError = require('../utils/AppError');
const { safeUnlink, cleanupUploadedFiles } = require('../utils/fileHelper');

const ALLOWED_FIELDS = [
  'sku',
  'model',
  'description',
  'brand',
  'productType',
  'httpLink',
  'status'
];

/**
 * 获取产品列表（支持模糊搜索与分页）
 */
exports.getProducts = async ({ search, page = 1, pageSize = 50 }) => {
  const limit = Math.min(Math.max(Number(pageSize) || 50, 1), 100);
  const currentPage = Math.max(Number(page) || 1, 1);
  const offset = (currentPage - 1) * limit;

  const where = {};
  if (search) {
    where[Op.or] = [
      { model: { [Op.like]: `%${search}%` } },
      { sku: { [Op.like]: `%${search}%` } }
    ];
  }

  const { count, rows } = await Product.findAndCountAll({
    where,
    limit,
    offset,
    distinct: true, // 防止多对多 include 导致 count 虚高
    include: [
      { model: Product, as: 'compatibleProducts', attributes: ['id'], through: { attributes: [] } },
      { model: Product, as: 'upgradeProducts', attributes: ['id'], through: { attributes: [] } },
      { model: Product, as: 'replacementProducts', attributes: ['id'], through: { attributes: [] } }
    ],
    order: [['id', 'DESC']]
  });

  const items = rows.map((p) => {
    const {
      compatibleProducts,
      upgradeProducts,
      replacementProducts,
      ...rest
    } = p.get({ plain: true });

    return {
      ...rest,
      compatibleIds: compatibleProducts?.map((cp) => cp.id) || [],
      upgradeIds: upgradeProducts?.map((up) => up.id) || [],
      replacementIds: replacementProducts?.map((rp) => rp.id) || []
    };
  });

  return {
    items,
    meta: {
      total: count,
      page: currentPage,
      pageSize: limit,
      totalPages: Math.ceil(count / limit)
    }
  };
};

/**
 * 内部辅助：校验 SKU 与 Model 唯一性
 */
const assertUniqueFields = async ({ sku, model }, excludeId = null) => {
  if (sku) {
    const where = excludeId ? { sku, id: { [Op.ne]: excludeId } } : { sku };
    const existingSku = await Product.findOne({ where });
    if (existingSku) throw new AppError('SKU 已存在，请使用其他 SKU', 400);
  }

  if (model) {
    const where = excludeId ? { model, id: { [Op.ne]: excludeId } } : { model };
    const existingModel = await Product.findOne({ where });
    if (existingModel) throw new AppError('型号（Model）已存在，请使用其他型号', 400);
  }
};

/**
 * 创建产品（失败自动清理已上传文件）
 */
exports.createProduct = async (body, files) => {
  try {
    const {
      sku,
      model,
      description = '',
      brand = '',
      productType = '',
      httpLink = '',
      status = 'active'
    } = body;

    await assertUniqueFields({ sku, model });

    const imagePath = files?.image?.[0] ? `/uploads/${files.image[0].filename}` : null;
    const manualPath = files?.manual?.[0] ? `/uploads/${files.manual[0].filename}` : null;

    return await Product.create({
      sku,
      model,
      description,
      brand,
      productType,
      httpLink,
      status,
      image: imagePath,
      manual: manualPath
    });
  } catch (err) {
    await cleanupUploadedFiles(files);
    throw err;
  }
};

/**
 * 更新产品（支持部分更新，先更库再删旧文件，失败回滚新文件）
 */
exports.updateProduct = async (id, body, files) => {
  try {
    const product = await Product.findByPk(id);
    if (!product) throw new AppError('未找到该产品', 404);

    // 仅在传入非空 sku/model 时查重
    await assertUniqueFields(
      {
        sku: body.sku || undefined,
        model: body.model || undefined
      },
      id
    );

    // 按需构建更新字段，防止部分更新清空原有数据
    const updateData = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const oldImage = product.image;
    const oldManual = product.manual;

    // 兼容 multipart/form-data 下前端传递 'null' 或 '' 清空文件
    if (files?.image?.[0]) {
      updateData.image = `/uploads/${files.image[0].filename}`;
    } else if (body.image === null || body.image === 'null' || body.image === '') {
      updateData.image = null;
    }

    if (files?.manual?.[0]) {
      updateData.manual = `/uploads/${files.manual[0].filename}`;
    } else if (body.manual === null || body.manual === 'null' || body.manual === '') {
      updateData.manual = null;
    }

    // 先更新数据库
    await product.update(updateData);

    // 数据库更新成功后，再安全清理被替换的旧文件
    const unlinkTasks = [];
    if (updateData.image !== undefined && updateData.image !== oldImage) {
      unlinkTasks.push(safeUnlink(oldImage));
    }
    if (updateData.manual !== undefined && updateData.manual !== oldManual) {
      unlinkTasks.push(safeUnlink(oldManual));
    }
    if (unlinkTasks.length > 0) {
      await Promise.all(unlinkTasks);
    }

    return product;
  } catch (err) {
    await cleanupUploadedFiles(files);
    throw err;
  }
};

/**
 * 删除产品（先删库，成功后再删物理文件）
 */
exports.deleteProduct = async (id) => {
  const product = await Product.findByPk(id);
  if (!product) throw new AppError('未找到该产品', 404);

  const { image, manual } = product;

  // 先删除数据库记录，防止外键约束报错导致文件已被误删
  await product.destroy();

  await Promise.all([safeUnlink(image), safeUnlink(manual)]);
};

/**
 * 获取产品关联关系
 */
exports.getProductRelations = async (id) => {
  const product = await Product.findByPk(id);
  if (!product) throw new AppError('产品不存在', 404);

  const [compatible, upgrade, replacement] = await Promise.all([
    product.getCompatibleProducts(),
    product.getUpgradeProducts(),
    product.getReplacementProducts()
  ]);

  return {
    compatible: compatible.map((p) => p.toJSON()),
    upgrade: upgrade.map((p) => p.toJSON()),
    replacement: replacement.map((p) => p.toJSON())
  };
};

/**
 * 设置产品关系（全量替换 + 去重 + 防自关联）
 */
exports.setProductRelations = async (id, { compatible = [], upgrade = [], replacement = [] }) => {
  const sourceId = Number(id);
  if (!Number.isInteger(sourceId) || sourceId <= 0) {
    throw new AppError('无效的源产品 ID', 400);
  }

  const product = await Product.findByPk(sourceId);
  if (!product) throw new AppError('产品不存在', 404);

  const allRawIds = [...compatible, ...upgrade, ...replacement];
  if (
    allRawIds.some((pid) => {
      const num = Number(pid);
      return Number.isNaN(num) || !Number.isInteger(num) || num <= 0;
    })
  ) {
    throw new AppError('无效的产品ID', 400);
  }

  // 统一转 Number、去重并剔除自身 ID
  const normalizeIds = (arr) =>
    [...new Set(arr.map(Number))].filter((targetId) => targetId !== sourceId);

  const relations = [
    ...normalizeIds(compatible).map((targetId) => [sourceId, targetId, 'compatible']),
    ...normalizeIds(upgrade).map((targetId) => [sourceId, targetId, 'upgrade']),
    ...normalizeIds(replacement).map((targetId) => [sourceId, targetId, 'replacement'])
  ];

  await sequelize.transaction(async (t) => {
    await sequelize.query(
      `DELETE FROM product_relations
       WHERE source_product_id = ?
       AND relation_type IN ('compatible', 'upgrade', 'replacement')`,
      { replacements: [sourceId], transaction: t }
    );

    if (relations.length > 0) {
      const placeholders = relations.map(() => '(?, ?, ?)').join(', ');
      await sequelize.query(
        `INSERT INTO product_relations
         (source_product_id, target_product_id, relation_type)
         VALUES ${placeholders}`,
        { replacements: relations.flat(), transaction: t }
      );
    }
  });
};

/**
 * 检查 SKU / Model 唯一性
 */
exports.checkUnique = async ({ sku, model, excludeId }) => {
  if (!sku && !model) {
    throw new AppError('必须提供 sku 或 model 参数', 400);
  }

  const where = sku ? { sku } : { model };
  if (excludeId) where.id = { [Op.ne]: excludeId };

  const exists = await Product.findOne({ where, attributes: ['id'] });
  return !exists;
};
