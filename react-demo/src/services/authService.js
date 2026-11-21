// services/authService.js
// ✅ 使用相对路径，适配生产和开发环境
const API_URL = '/api/auth/';

export default {
  async login(credentials) {
    const res = await fetch(`${API_URL}login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials), // ✅ 必须序列化为字符串
      credentials: 'include' // 如果需要 cookies
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ message: '登录失败' }));
      throw new Error(errData.message || '网络错误');
    }

    return await res.json();
  },

  async register(credentials) {
    const res = await fetch(`${API_URL}register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials), // ✅ 必须序列化为字符串
      credentials: 'include'
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ message: '注册失败' }));
      throw new Error(errData.message || '网络错误');
    }

    return await res.json();
  }
};
