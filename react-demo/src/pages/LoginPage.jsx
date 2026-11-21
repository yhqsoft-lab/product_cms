// src/pages/LoginPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
// ✅ 修复 1：导入路径必须与实际文件一致
import { useUser } from '../context/useUser';
import { useToast } from '../components/useToast';

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ✅ 修复 2：直接使用 useUser 提供的 login 方法，移除 authService 冗余调用
  const { login } = useUser();
  const { success, error: showToastError } = useToast();
  const navigate = useNavigate();
  const usernameRef = useRef();

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  // 表单验证函数
  const validateForm = () => {
    if (!username.trim() || !password.trim()) {
      showToastError('请输入用户名和密码');
      return false;
    }

    if (isRegistering) {
      if (password !== confirmPassword) {
        showToastError('两次输入的密码不一致');
        return false;
      }
      if (password.length < 8) {
        showToastError('密码长度至少8位');
        return false;
      }
      if (!/[A-Z]/.test(password)) {
        showToastError('密码必须包含大写字母（如 A）');
        return false;
      }
      if (!/\d/.test(password)) {
        showToastError('密码必须包含数字（如 1）');
        return false;
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        showToastError('密码必须包含特殊字符（如 !@#$%）');
        return false;
      }
    }
    return true;
  };

  // ✅ 修复 3：统一处理登录/注册，消除重复请求与状态冲突
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setFormError('');

    try {
      if (isRegistering) {
        // 注册逻辑（直接调用后端接口）
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            password,
            confirmPassword
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || '注册失败');

        success('注册成功，请登录');
        setIsRegistering(false);
        setPassword('');
        setConfirmPassword('');
      } else {
        // 登录逻辑（复用 useUser 的 login，自动处理 Token 存储与状态更新）
        await login({ username: username.trim(), password });
        success('登录成功');
        navigate('/products', { replace: true }); // 可改为 /fccs
      }
    } catch (err) {
      const msg = err.message || '操作失败，请稍后重试';
      setFormError(msg);
      showToastError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSubmit(e);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-indigo-600">产品管理系统</h1>
          <p className="mt-2 text-gray-600">
            {isRegistering ? '创建新账户' : '欢迎回来，请登录继续'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 用户名 */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              用户名
            </label>
            {/* ✅ 修复 4：清除 JSX 语法错误（= > 改为 =>，& & 改为 &&） */}
            <input
              ref={usernameRef}
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="请输入用户名"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              disabled={isLoading}
            />
          </div>

          {/* 密码 */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="请输入密码"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              disabled={isLoading}
            />
          </div>

          {/* 确认密码（仅注册时显示） */}
          {isRegistering && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                确认密码
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="请确认密码"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                disabled={isLoading}
              />
            </div>
          )}

          {/* 错误提示 */}
          {formError && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
              {formError}
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={isLoading}
            // ✅ 修复 5：修复断裂的 Tailwind 类名
            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              isLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isLoading ? '处理中...' : (isRegistering ? '注册' : '登录')}
          </button>

          {/* 切换模式 */}
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setFormError('');
                setPassword('');
                setConfirmPassword('');
              }}
              className="text-indigo-600 hover:text-indigo-800 text-sm"
              disabled={isLoading}
            >
              {isRegistering ? '已有账户？立即登录' : '新用户？创建账户'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
