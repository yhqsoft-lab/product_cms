// middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDir = 'public/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.floor(Math.random() * 1000);

    if (file.fieldname === 'manual') {
      cb(null, 'manual-' + uniqueSuffix + ext);
    } else {
      cb(null, 'image-' + uniqueSuffix + ext);
    }
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true); // PDF 走 manual 逻辑
  } else if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype)) {
    cb(null, true); // 图片走 image 逻辑
  } else {
    cb(new Error('仅允许上传 PDF 或图片文件 (JPEG, PNG, GIF, WebP)'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB 限制
});

// ✅ 导出完整的 multer 实例（不是 single）
module.exports = upload;
