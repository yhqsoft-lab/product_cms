// src/utils/fetchWithAuth.js - 简化版本

const getToken = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    return user.token || null;
  } catch (e) {
    return null;
  }
};

/**
 * 智能处理 Content-Type 的 fetch 封装
 */
export const fetchWithAuth = (url, options = {}) => {
  const token = getToken();

  // 检查是否是 FormData
  const isFormData = options.body instanceof FormData;

  // 创建 headers 对象
  let headers = {};

  // 添加认证头
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 如果不是 FormData，默认设置为 JSON
  if (!isFormData && options.body) {
    // 如果没有手动设置 Content-Type
    const hasContentType = options.headers &&
      (options.headers['Content-Type'] || options.headers['content-type']);

    if (!hasContentType) {
      headers['Content-Type'] = 'application/json';
    }
  }

  // 合并用户提供的 headers
  if (options.headers) {
    headers = {
      ...headers,
      ...options.headers
    };
  }

  // 重要：如果是 FormData，移除所有 Content-Type 头
  if (isFormData) {
    delete headers['Content-Type'];
    delete headers['content-type'];
  }

  // 调试信息
  console.log('fetchWithAuth:', {
    url,
    method: options.method,
    isFormData,
    headers,
    hasBody: !!options.body
  });

  // 准备请求体
  let body = options.body;
  if (body && !isFormData && typeof body === 'object') {
    // 如果是普通对象，转换为 JSON 字符串
    body = JSON.stringify(body);
  }

  return fetch(url, {
    ...options,
    headers,
    body
  });
};
