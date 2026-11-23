// services/fccService.js
const { Op } = require('sequelize');
const { Fcc, Product } = require('../models');
const AppError = require('../utils/AppError');
const { safeUnlink } = require('../utils/fileHelper');

exports.getFccs = async ({ search, limit = 100 }) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
  const where = search
    ? {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ]
      }
    : {};

  return Fcc.findAll({
    where,
    limit: safeLimit,
    order: [['id', 'DESC']]
  });
};

exports.getProductsByFcc = async (id) => {
  const fcc = await Fcc.findByPk(id, {
    include: [{ model: Product, as: 'Products', through: { attributes: [] } }]
  });
  if (!fcc) throw new AppError('FCC 未找到', 404);
  return fcc.Products;
};

exports.addProductToFcc = async (fccId, productId) => {
  if (!fccId || !productId) {
    throw new AppError('缺少必要参数', 400);
  }

  const [fcc, product] = await Promise.all([
    Fcc.findByPk(fccId),
    Product.findByPk(productId)
  ]);

  if (!fcc) throw new AppError('FCC 未找到', 404);
  if (!product) throw new AppError('产品未找到', 404);

  const alreadyAssociated = await fcc.hasProduct(product);
  if (alreadyAssociated) {
    const err = new AppError('产品已关联到此 FCC', 400);
    err.code = 'ALREADY_ASSOCIATED';
    throw err;
  }

  await fcc.addProduct(product);
};

exports.removeProductFromFcc = async (fccId, productId) => {
  const [fcc, product] = await Promise.all([
    Fcc.findByPk(fccId),
    Product.findByPk(productId)
  ]);

  if (!fcc) throw new AppError('FCC 未找到', 404);
  if (!product) throw new AppError('产品未找到', 404);

  await fcc.removeProduct(product);
};

exports.createFcc = async (body, file) => {
  const newImagePath = file ? `/uploads/${file.filename}` : null;

  try {
    const { name, description, brand, productType, speed } = body;

    if (!name?.trim() || !brand?.trim()) {
      throw new AppError('缺少必要字段 (name, brand)', 400);
    }

    return await Fcc.create({
      name: name.trim(),
      description: description?.trim() || null,
      brand: brand.trim(),
      productType,
      speed,
      image: newImagePath
    });
  } catch (err) {
    // 校验或写入失败时清理刚上传的图片
    if (newImagePath) await safeUnlink(newImagePath);
    throw err;
  }
};

exports.updateFcc = async (id, body, file) => {
  const newImagePath = file ? `/uploads/${file.filename}` : null;

  try {
    const fcc = await Fcc.findByPk(id);
    if (!fcc) throw new AppError('未找到该记录', 404);

    const { name, description, brand, productType, speed } = body;
    const oldImage = fcc.image;

    await fcc.update({
      name: name !== undefined ? name.trim() : fcc.name,
      description: description !== undefined ? (description.trim() || null) : fcc.description,
      brand: brand !== undefined ? brand : fcc.brand,
      productType: productType !== undefined ? productType : fcc.productType,
      speed: speed !== undefined ? speed : fcc.speed,
      image: newImagePath ?? fcc.image
    });

    // 先更新数据库，成功后再清理旧图片
    if (newImagePath && oldImage && oldImage !== newImagePath) {
      await safeUnlink(oldImage);
    }

    return fcc;
  } catch (err) {
    if (newImagePath) await safeUnlink(newImagePath);
    throw err;
  }
};

exports.deleteFcc = async (id) => {
  const fcc = await Fcc.findByPk(id);
  if (!fcc) throw new AppError('未找到该记录', 404);

  const oldImage = fcc.image;

  // 先删库，成功后再删物理文件
  await fcc.destroy();
  if (oldImage) await safeUnlink(oldImage);
};
