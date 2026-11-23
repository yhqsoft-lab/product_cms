// utils/fileHelper.js
const fs = require('fs/promises');
const path = require('path');

const PUBLIC_DIR = path.resolve(__dirname, '../public');

/**
 * 安全删除 /uploads/ 下的物理文件
 */
exports.safeUnlink = async (relativePath) => {
  if (!relativePath || !relativePath.startsWith('/uploads/') || relativePath.includes('..')) {
    return;
  }
  const fullPath = path.join(PUBLIC_DIR, relativePath);
  try {
    await fs.unlink(fullPath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`删除文件失败 [${fullPath}]:`, err.message);
    }
  }
};

/**
 * 清理本次 Multer 上传的临时文件（用于校验失败或 DB 异常回滚）
 */
exports.cleanupUploadedFiles = async (files) => {
  if (!files) return;
  const tasks = [];
  if (files.image?.[0]) {
    tasks.push(exports.safeUnlink(`/uploads/${files.image[0].filename}`));
  }
  if (files.manual?.[0]) {
    tasks.push(exports.safeUnlink(`/uploads/${files.manual[0].filename}`));
  }
  await Promise.all(tasks);
};
