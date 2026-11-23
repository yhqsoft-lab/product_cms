// src/App.jsx
import React, { useEffect } from 'react';
import {
  Routes,
  Route,
  useLocation,
  Navigate,
  Outlet,
  useNavigate
} from 'react-router-dom';
import { UserProvider, useUser } from './context/useUser';

// 组件导入
import DashboardLayout from './components/DashboardLayout';
import LoginPage from './pages/LoginPage';
import FccManagement from './pages/FccManagement';
import ProductManagement from './pages/ProductManagement';
import ProductCatalog from './pages/ProductCatalog';
import ProductView from './pages/ProductView';
import IdleWarningDialog from './components/IdleWarningDialog';

// 🔍 自动登出监听器
const AutoLogoutWatcher = () => {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const publicRoutes = ['/login', '/productview', '/productcatalog'];

  useEffect(() => {
    if (!loading && !user && !publicRoutes.includes(location.pathname)) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate, location.pathname]);

  return null;
};

// 🔐 受保护的路由组件
const ProtectedRoute = () => {
  const { user, loading } = useUser();
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">验证中...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

// 📐 主仪表盘布局组件
const AppLayout = () => {
  return (
    <DashboardLayout>
      <AutoLogoutWatcher />
      <Outlet />
    </DashboardLayout>
  );
};

// 🚀 核心路由组件（✅ 必须在 UserProvider 内部渲染，才能安全调用 useUser）
const AppRoutes = () => {
  const { showIdleWarning, onContinueSession, logout } = useUser();

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route path="/productcatalog" element={<ProductCatalog />} />
          <Route path="/productview" element={<ProductView />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/fccs" element={<FccManagement />} />
            <Route path="/products" element={<ProductManagement />} />
          </Route>
          <Route path="/" element={<Navigate to="/productview" replace />} />
        </Route>
      </Routes>

      {/* ✅ 空闲警告弹窗 */}
      {showIdleWarning && (
        <IdleWarningDialog
          onContinue={onContinueSession}
          onLogout={logout}
        />
      )}
    </>
  );
};

// 🚀 主应用组件
export default function App() {
  return (
    // 🔑 UserProvider 包裹全局，AppRoutes 在其内部才能正确获取 Context
    <UserProvider>
      <AppRoutes />
    </UserProvider>
  );
}
