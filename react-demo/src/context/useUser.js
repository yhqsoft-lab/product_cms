// src/context/useUser.js
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const UserContext = createContext(null);

// ✅ 空闲检测配置
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 分钟（毫秒）
const WARNING_TIMEOUT = 28 * 60 * 1000;    // 28 分钟时弹出警告（可选）

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ 空闲检测相关状态
  const idleTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const [showIdleWarning, setShowIdleWarning] = useState(false);

  // ✅ 清理所有计时器
  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
  }, []);

  // 🚀 核心修复：定义路由白名单，拦截不必要的跳转
  const redirectIfNotPublic = () => {
    // 允许免登录驻留的公开页面
    const publicPaths = ['/login', '/fccview', '/productview'];
    const currentPath = window.location.pathname.toLowerCase();

    // 如果当前路径不在白名单中，才强制跳转到 /login
    const isPublicPage = publicPaths.some(path => currentPath.startsWith(path));

    if (!isPublicPage) {
      window.location.href = '/login';
    }
  };

  // ✅ 执行登出（自动 + 手动共用）
  const performLogout = useCallback(() => {
    clearTimers();

    // 1️⃣ 清理 localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('refresh_token');

    // 🚀 2️⃣ 发送带有时间戳的专属登出信号（百分百防止死循环崩溃）
    localStorage.setItem('logout_timestamp', Date.now().toString());

    // 3️⃣ 更新当前标签页状态
    setUser(null);
    setToken(null);
    setShowIdleWarning(false);

    // 4️⃣ 跳转判定（跳过 fccview 和 productview）
    redirectIfNotPublic();
  }, [clearTimers]);

  // ✅ 重置空闲计时器
  const resetIdleTimer = useCallback(() => {
    if (!token) return;

    clearTimers();
    setShowIdleWarning(false);

    warningTimerRef.current = setTimeout(() => {
      setShowIdleWarning(true);
    }, WARNING_TIMEOUT);

    idleTimerRef.current = setTimeout(() => {
      console.log('⏰ 30 分钟无操作，自动登出');
      performLogout();
    }, INACTIVITY_TIMEOUT);
  }, [token, clearTimers, performLogout]);

  // ✅ 用户活动事件处理器
  const handleUserActivity = useCallback(() => {
    resetIdleTimer();
  }, [resetIdleTimer]);

  // ✅ 监听用户活动事件
  useEffect(() => {
    if (!token) {
      clearTimers();
      return;
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'visibilitychange'];

    events.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    resetIdleTimer();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
      clearTimers();
    };
  }, [token, handleUserActivity, clearTimers, resetIdleTimer]);

  // 🚀 跨标签页同步：监听其他标签页的登出
  useEffect(() => {
    const handleStorageChange = (e) => {
      // 监听专属登出信号或 token 被删
      if (e.key === 'logout_timestamp' || (e.key === 'auth_token' && e.newValue === null)) {
        console.warn('📡 收到其他标签页的登出信号，正在同步退出...');

        clearTimers();
        setUser(null);
        setToken(null);
        setShowIdleWarning(false);

        // 同样适用白名单判定（前台页面不强制跳登录）
        redirectIfNotPublic();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [clearTimers]);

  // ✅ 页面加载时从 localStorage 恢复认证状态
  useEffect(() => {
    const restoreAuth = async () => {
      try {
        const savedToken = localStorage.getItem('auth_token');
        const savedUser = localStorage.getItem('auth_user');

        if (savedToken && savedUser) {
          try {
            const res = await fetch('/api/auth/me', {
              headers: {
                'Authorization': `Bearer ${savedToken}`,
                'Content-Type': 'application/json'
              }
            });

            if (res.ok) {
              const responseData = await res.json();
              const userData = responseData.data || responseData;
              setToken(savedToken);
              setUser(userData);
            } else {
              localStorage.removeItem('auth_token');
              localStorage.removeItem('auth_user');
              localStorage.removeItem('refresh_token');
            }
          } catch (err) {
            console.warn('⚠️ 验证 token 失败，使用本地缓存:', err.message);
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
          }
        }
      } catch (err) {
        console.error('恢复认证状态失败:', err);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('refresh_token');
      } finally {
        setLoading(false);
      }
    };

    restoreAuth();
  }, []);

  // ✅ 登录方法
  const login = useCallback(async (credentials) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || '登录失败');
    }

    const responseData = await res.json();
    const data = responseData.data || responseData;
    const token = data.token;
    const user = data.user;
    const refreshToken = data.refreshToken;

    if (!token || !user) {
      throw new Error('登录响应格式异常');
    }

    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);

    setToken(token);
    setUser(user);

    return { token, user };
  }, []);

  // ✅ 登出方法（手动调用）
  const logout = useCallback(() => {
    performLogout();
  }, [performLogout]);

  // ✅ 刷新 Token 方法
  const refreshAccessToken = useCallback(async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;

    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!res.ok) return false;

      const responseData = await res.json();
      const data = responseData.data || responseData;
      const token = data.token;
      const user = data.user;

      if (!token) return false;

      localStorage.setItem('auth_token', token);
      if (user) localStorage.setItem('auth_user', JSON.stringify(user));

      setToken(token);
      if (user) setUser(user);
      return true;
    } catch {
      return false;
    }
  }, []);

  const handleContinueSession = useCallback(() => {
    setShowIdleWarning(false);
    resetIdleTimer();
  }, [resetIdleTimer]);

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    refreshAccessToken,
    showIdleWarning,
    onContinueSession: handleContinueSession
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser 必须在 UserProvider 内使用');
  }
  return context;
};
