import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/useUser'; // ✅ 使用独立钩子
import { useToast } from '../components/useToast'; // ✅ 使用独立钩子

export default function LoginPage({ onLogin }) {
  // ✅ 直接赋值给用户名和密码
  const [username, setUsername] = useState('admin'); // 预设用户名
  const [password, setPassword] = useState('admin123'); // 预设密码

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
      const mockUserData = {
        id: Date.now(),
        username,
        role: 'admin',
        token: 'mock-jwt-token'
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
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-indigo-600">产品管理系统</h1>
          <p className="mt-2 text-gray-600">欢迎回来，请登录继续</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow-md">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              用户名
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          {formError && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md">
              {formError}
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              登录
            </button>
          </div>

          <div className="flex justify-between text-sm">
            <button
              type="button"
              onClick={() => alert('忘记密码功能暂未实现')}
              className="text-indigo-600 hover:text-indigo-800"
            >
              忘记密码？
            </button>

            <button
              type="button"
              onClick={() => alert('注册功能暂未实现')}
              className="text-indigo-600 hover:text-indigo-800"
            >
              创建账户
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
