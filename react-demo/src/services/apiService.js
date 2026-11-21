// services/apiService.js
const AUTH_API_URL = '/api/auth';
const USERS_API_URL = '/api/users'; // ✅ 用户 API 基础路径

// 通用请求函数
async function request(baseURL, endpoint, options = {}) {
  const url = `${baseURL}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `请求失败: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error('请求异常:', err);
    throw err;
  }
}

// 认证相关 API
export const authApi = {
  login(credentials) {
    return request(AUTH_API_URL, '/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },
  register(userData) {
    return request(AUTH_API_URL, '/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },
  getCurrentUser(token) {
    return request(USERS_API_URL, '/me', { // ✅ 正确路径
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  logout() {
    localStorage.removeItem('auth_token');
  }
};
