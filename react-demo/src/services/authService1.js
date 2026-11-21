// services/authService.js
const API_URL = 'http://localhost:5000/api/auth/login';

export default {
  async login(credentials) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    // ✅ 防止非 JSON 响应
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      throw new Error('响应不是 JSON 格式: ' + text);
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ message: '登录失败' }));
      throw new Error(errData.message || '网络错误');
    }

    return await res.json();
  }
};


{/*

  // ✅ 注册
  register(userData) {
    return apiRequest('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
  },

  // ✅ 获取当前用户
  getCurrentUser(token) {
    return apiRequest('/user', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  },

  // ✅ 登出
  logout() {
    localStorage.removeItem('auth_token');
  }
};
*/}
