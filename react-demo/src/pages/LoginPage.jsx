// src/pages/LoginPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/useUser';
import { useToast } from '../components/useToast';

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useUser();
  const { success, error: showToastError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const usernameRef = useRef(null);

  // 支持从 RequireAuth 拦截跳转过来后，登录成功返回原页面
  const redirectPath = location.state?.from?.pathname || '/products';

  useEffect(() => {
    usernameRef.current?.focus();
  }, [isRegistering]);

  const showValidationError = (msg) => {
    setFormError(msg);
    showToastError(msg);
    return false;
  };

  // 表单校验（与后端 User.js 约束对齐）
  const validateForm = () => {
    const trimmedUsername = username.trim();

    if (!trimmedUsername || !password.trim()) {
      return showValidationError('请输入用户名和密码');
    }

    if (isRegistering) {
      if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
        return showValidationError('用户名长度需在 3 到 50 位之间');
      }
      if (password !== confirmPassword) {
        return showValidationError('两次输入的密码不一致');
      }
      if (password.length < 8) {
        return showValidationError('密码长度至少 8 位');
      }
      if (!/[A-Z]/.test(password)) {
        return showValidationError('密码必须包含大写字母（如 A）');
      }
      if (!/\d/.test(password)) {
        return showValidationError('密码必须包含数字（如 1）');
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return showValidationError('密码必须包含特殊字符（如 !@#$%）');
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    setFormError('');
    if (!validateForm()) return;

    setIsLoading(true);
    const trimmedUsername = username.trim();

    try {
      if (isRegistering) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: trimmedUsername,
            password,
            confirmPassword
          })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || `注册失败 (${res.status})`);
        }

        success('注册成功，请登录');
        setIsRegistering(false);
        setPassword('');
        setConfirmPassword('');
      } else {
        await login({ username: trimmedUsername, password });
        success('登录成功');
        navigate(redirectPath, { replace: true });
      }
    } catch (err) {
      const msg = err.message || '操作失败，请稍后重试';
      setFormError(msg);
      showToastError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering((prev) => !prev);
    setFormError('');
    setPassword('');
    setConfirmPassword('');
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
            <input
              ref={usernameRef}
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请确认密码"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                disabled={isLoading}
              />
            </div>
          )}

          {/* 错误提示 */}
          {formError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {formError}
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={isLoading}
            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              isLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isLoading ? '处理中...' : isRegistering ? '注册' : '登录'}
          </button>

          {/* 切换模式 */}
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={toggleMode}
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
