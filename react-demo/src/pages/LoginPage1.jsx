import React, { useState } from 'react';
import authService from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/useUser';
import { useToast } = require('../components/useToast');

export default function LoginPage({ onLogin }) {
  const isDev = process.env.NODE_ENV === 'development';
  const [username, setUsername] = useState(isDev ? 'admin' : '');
  const [password, setPassword] = useState(isDev ? 'admin123' : '');
  const [formError, setFormError] = useState('');
  const { login } = useUser();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      error('请输入用户名和密码');
      return;
    }

    try {
      const res = await authService.login({ username, password });
      const mockUserData = {
        id: Date.now(),
        username,
        role: 'admin',
        token: res.accessToken
      };

      login(mockUserData);
      if (onLogin) onLogin();
      success('登录成功');
      navigate('/fccs');
    } catch (err) {
      error(`登录失败: ${err.message}`);
      setFormError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-indigo-600">产品管理系统</h0>
          <p className="mt-2 text-gray-600">欢迎回来，请登录继续</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 用户名输入 */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              用户名
            </label>
            <input
              id="username"
              type="text"
              value={isDev ? 'admin' : username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* 密码输入 */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              密码
            </label>
            <input
              id="password"
              type="password"
              value={isDev ? 'admin123' : password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* 错误提示 */}
          {formError && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md">
              {formError}
            </div>
          )}

          {/* 登录按钮 */}
          <button
            type="submit"
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            登录
          </button>

          <p className="text-center text-gray-500 text-sm mt-4">
            {isDev ? '开发环境默认值：admin / admin123' : '生产环境请手动输入'}
          </p>
        </form>
      </div>
    </div>
  );
}
