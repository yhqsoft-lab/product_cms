//import fs from 'fs/promises';
//import { Op } from 'sequelize'
const { Op } = require('sequelize'); // ✅ 必须导入 Op
//const Product = require('../models/Product');
const fs = require('fs/promises');
const { Product } = require('../models');
//import { Product } from '../models/Product.js'




// 获取所有产品（支持模糊搜索）
exports.getProducts = async (req, res) => {
  const { search } = req.query;

  try {
    let results;
    if (search) {
      // 多字段模糊搜索 + 倒序显示
      results = await Product.findAll({
        where: {
          [Op.or]: [
            { model: { [Op.like]: `%${search}%` } },
            { description: { [Op.like]: `%${search}%` } }
          ]
        },
        order: [['id', 'DESC']] // 按 ID 倒序排列
      });
    } else {
      // 获取全部产品并按 ID 倒序显示
      results = await Product.findAll({
        order: [['id', 'DESC']]
      });
    }

    // 返回结果
    res.status(200).json(results);
  } catch (err) {
    console.error('搜索失败:', err);
    res.status(500).json({ message: '服务器内部错误' });
  }
};




// 添加新产品
/*
exports.createProduct = async (req, res) => {
  try {
    const newProduct = await Product.create(req.body);
    res.status(201).json(newProduct);
  } catch (err) {
    console.error('创建 Product 失败:', err);
    res.status(400).json({ message: err.message, error: err });
  }
};

*/
// 添加新产品
exports.createProduct = async (req, res) => {
  console.log('req.body:', req.body);     // 👈 看是否接收到了 model/description
  console.log('req.file:', req.file);     // 👈 看是否上传了图片

  try {
    const { model, description, brand, productType, httpLink } = req.body;

    if (!model) {
      return res.status(400).json({ message: '缺少必要字段' });
    }

    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
//     const newProduct = await Product.create(req.body); // ✅ 确保模型已初始化

    const newProduct = await Product.create({
      model,
      description,
      brand,
      productType,
      httpLink,
      image: imagePath
    });

    res.status(201).json(newProduct);
  } catch (err) {
    console.error('创建产品失败:', err.message);
    res.status(400).json({ message: err.message });
  }
};

// 修改产品
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: '未找到该产品' });

  const { productType, description, brand, model, httpLink} = req.body;

  let imagePath = product.image;

  if (req.file) {
    imagePath = `/uploads/${req.file.filename}`;
  }



//    const imagePath = req.file ? `/uploads/${req.file.filename}` : Product.image;

    await product.update({
       productType,
       description,
       brand,
       model,
       httpLink,
      image: imagePath
    });

    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 删除产品
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: '未找到该产品' });

    // 删除本地图片文件（如果存在）
    //  if (product.image && fs.existsSync(`public${product.image}`)) {
    //  fs.unlinkSync(`public${product.image}`);
    //  }

    try {
      if (product.image) {
        const filePath = `public${product.image}`;
       await fs.access(filePath); // 检查文件是否存在
      await fs.unlink(filePath); // 删除文件
      }
    } catch (err) {
      console.error('删除图片失败:', err);
      return res.status(500).json({ message: '图片删除失败，操作终止' }); // ❌ 中断流程
    }


    await product.destroy();
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ message: '删除失败1111，请重试' });
  }
};
// ✅ 必须有这一行导出
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: '产品不存在' });
    }
    res.json(product);
  } catch (err) {
    console.error('获取产品失败:', err);
    res.status(500).json({ message: '服务器内部错误' });
  }
};
