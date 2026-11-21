// src/App.jsx
import React, { useEffect } from 'react';
import { Routes, Route, useLocation, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useUser } from './context/UserContext';
import NavBar from './components/NavBar';
import LoginPage from './pages/LoginPage';
import FccManagement from './pages/FccManagement';
import ProductManagement from './pages/ProductManagement';
import ProductCatalog from './pages/ProductCatalog';
import ProductView from './pages/ProductView';

// 👇 新增：自动登出监听器
// 👇 修正后：带白名单机制的自动登出监听器
const AutoLogoutWatcher = () => {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  // 🛡️ 定义公开白名单：这些页面不需要强制登录
  const publicRoutes = ['/login', '/productview', '/productcatalog'];

  useEffect(() => {
    // 当用户未登录，并且当前路径【不在公开白名单内】时，才强制跳登录页
    if (!loading && !user && !publicRoutes.includes(location.pathname)) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate, location.pathname]);

  return null; // 不渲染任何内容
};

// 受保护的路由组件
const ProtectedRoute = () => {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>验证用户状态中...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

// 布局组件
const AppLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
   <NavBar />
      <main className="container mx-auto px-4 py-8">
        {/* 👇 关键：插入自动登出监听器 */}
        <AutoLogoutWatcher />
        <Outlet />
      </main>
    </div>
  );
};

export default function App() {
  return (
    <Routes>
      {/* 登录页面，不使用AppLayout */}
      <Route path="/login" element={<LoginPage />} />

      {/* 其他页面使用AppLayout */}
      <Route element={<AppLayout />}>
        <Route path="/productcatalog" element={<ProductCatalog />} />
        <Route path="/productview" element={<ProductView />} />

        {/* 受保护的路由 */}
        <Route element={<ProtectedRoute />}>
          <Route path="/fccs" element={<FccManagement />} />
          <Route path="/products" element={<ProductManagement />} />
        </Route>

        <Route path="/" element={<Navigate to="/productview" replace />} />
      </Route>
    </Routes>
  );
}
