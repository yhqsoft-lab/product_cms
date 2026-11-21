// src/context/UserContext.jsx
import React, { createContext, useState, useEffect, useCallback } from 'react';

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 活动检测配置
  const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10分钟自动登出
  const WARNING_TIME = 2 * 60 * 1000; // 提前2分钟警告

  // 登录方法
  const login = (userData) => {
    // 确保 userData 包含必要的字段
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

  // 登出方法
  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    // 清除所有定时器
    if (window.inactivityTimer) clearTimeout(window.inactivityTimer);
//    if (window.warningTimer) clearTimeout(window.warningTimer);
// 👇 新增：通知全局登出
    window.dispatchEvent(new CustomEvent('user-logout'));
  };

  // 重置活动计时器
  const resetInactivityTimer = useCallback(() => {
    // 直接从当前状态或 localStorage 获取 token
    const currentToken = user?.token || (() => {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          return userData.token || null;
        } catch (e) {
          return null;
        }
      }
      return null;
    })();

    if (!currentToken) return;

    // 清除现有定时器
    if (window.inactivityTimer) clearTimeout(window.inactivityTimer);
//    if (window.warningTimer) clearTimeout(window.warningTimer);

    // 设置警告定时器
{/*    window.warningTimer = setTimeout(() => {
      // 再次检查 token 是否仍然有效
      const tokenStillValid = user?.token || (() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser).token : null;
      })();

      if (tokenStillValid) {
        alert('⚠️ 注意：您将在2分钟后因长时间不操作而自动登出！');
      }
    }, INACTIVITY_TIMEOUT - WARNING_TIME);
*/}
    // 设置登出定时器
    window.inactivityTimer = setTimeout(() => {
      const tokenStillValid = user?.token || (() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser).token : null;
      })();

      if (tokenStillValid) {
        alert('🔒 因长时间不操作，您已被自动登出');
        logout();
      }
    }, INACTIVITY_TIMEOUT);
  }, [user?.token]); // ✅ 依赖 token 变化

  // 监听用户活动
  useEffect(() => {
    // 检查是否有有效的 token
    const hasValidToken = user?.token || (() => {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser).token : null;
    })();

    if (!hasValidToken) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => resetInactivityTimer();

    // 添加事件监听器
    events.forEach(event => {
      window.addEventListener(event, handleActivity, true);
    });

    // 初始化定时器
    resetInactivityTimer();

    // 清理函数
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity, true);
      });
      if (window.inactivityTimer) clearTimeout(window.inactivityTimer);
  //    if (window.warningTimer) clearTimeout(window.warningTimer);
    };
  }, [user?.token, resetInactivityTimer]); // ✅ 关键：依赖 token 变化

  // 验证用户状态（只在组件挂载时执行一次）
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
          // 验证 token 是否有效
          const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${userData.token}` }
          });

          if (res.ok) {
            const verifiedData = await res.json();
            // 确保存储的数据包含 token
            const userWithToken = {
              ...verifiedData,
              token: userData.token // 保留原始 token
            };
            setUser(userWithToken);
            localStorage.setItem('user', JSON.stringify(userWithToken));
          } else {
            localStorage.removeItem('user');
            setUser(null);
          }
        } else {
          localStorage.removeItem('user');
          setUser(null);
        }
      } catch (err) {
        console.error('验证用户状态失败:', err);
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    validateUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = React.useContext(UserContext);
  if (!context) {
    throw new Error('useUser 必须在 UserProvider 内部使用');
  }
  return context;
};
