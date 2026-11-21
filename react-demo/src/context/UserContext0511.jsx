// src/context/UserContext.jsx
import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import SessionExpiredDialog from '../components/SessionExpiredDialog';

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExpiredDialog, setShowExpiredDialog] = useState(false);

  const inactivityTimerRef = useRef(null);
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30分钟

  const BASE_URL = 'http://localhost:5000';

  // 登录
  const login = (userData) => {
    const userToStore = {
      id: userData.id,
      username: userData.username,
      role: userData.role,
      token: userData.token
    };
    localStorage.setItem('user', JSON.stringify(userToStore));
    setUser(userToStore);
    resetInactivityTimer();
  };

  // 手动登出
  const manualLogout = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    // 1. 清除当前用户数据
    localStorage.removeItem('user');

    // 🚀 2. 核心大招：强制写入一个带时间戳的退出信号，保证其他标签页100%能监听到！
    localStorage.setItem('logoutEvent', Date.now().toString());

    // 3. 清除内存并跳转
    setUser(null);
    window.location.href = '/login';
  };

  // 30分钟无操作处理
  const handleInactivityTimeout = () => {
    setShowExpiredDialog(true);
  };

  // 重置活动计时器
  const resetInactivityTimer = useCallback(() => {
    const currentToken = user?.token || (() => {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try { return JSON.parse(savedUser).token || null; } catch { return null; }
      }
      return null;
    })();

    if (!currentToken) return;

    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(handleInactivityTimeout, INACTIVITY_TIMEOUT);
  }, [user?.token, INACTIVITY_TIMEOUT]);

  // 监听用户活动
  useEffect(() => {
    const hasValidToken = user?.token || (() => {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser).token : null;
    })();

    if (!hasValidToken) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => resetInactivityTimer();

    events.forEach(event => window.addEventListener(event, handleActivity));
    resetInactivityTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, [user?.token, resetInactivityTimer]);

  // 🚀 跨标签页状态同步监听（监听专门的 logoutEvent）
  useEffect(() => {
    const handleStorageChange = (e) => {
      // 只要监听到退出信号，或者 user 缓存被清空，立刻强制登出
      if (e.key === 'logoutEvent' || (e.key === 'user' && !e.newValue)) {
        console.warn('📡 收到其他标签页的登出信号，正在同步退出...');
        setUser(null);
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
          inactivityTimerRef.current = null;
        }
        window.location.href = '/login';
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // 初始化验证
  useEffect(() => {
    const validateUser = async () => {
      const savedUser = localStorage.getItem('user');
      if (!savedUser) {
        setLoading(false);
        return;
      }

      try {
        const userData = JSON.parse(savedUser);
        if (userData.token) {
          const res = await fetch(`${BASE_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${userData.token}` }
          });

          if (res.ok) {
            const verifiedData = await res.json();
            setUser({ ...verifiedData, token: userData.token });
          } else {
            console.warn('登录信息已过期');
            localStorage.removeItem('user');
            setUser(null);
          }
        } else {
          localStorage.removeItem('user');
          setUser(null);
        }
      } catch (err) {
        console.error('网络错误或跨域问题，无法验证状态:', err);
      } finally {
        setLoading(false);
      }
    };

    validateUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, login, logout: manualLogout, loading }}>
      {children}
      {showExpiredDialog && (
        <SessionExpiredDialog onRelogin={manualLogout} />
      )}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = React.useContext(UserContext);
  if (!context) throw new Error('useUser 必须在 UserProvider 内部使用');
  return context;
};
