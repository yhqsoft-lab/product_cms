// src/utils/apiClient.js
export const apiClient = async (url, options = {}) => {
  let token = localStorage.getItem('authToken');

  // ✅ 兼容旧版存储格式
  if (!token) {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        token = userData.token;
      } catch (e) {
        console.error('解析 user 数据失败', e);
      }
    }
  }

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    }
  };

  return fetch(url, config);
};
