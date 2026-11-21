import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/NavBar';
import LoginPage from './pages/LoginPage';
import FccManagement from './pages/FccManagement';
// import ProductManagement from './pages/ProductManagement';
import RequireAuth from './components/RequireAuth';
import UnauthorizedPage from './pages/UnauthorizedPage';

export default function App() {


  return (
    <div className="min-h-screen flex flex-col">
      {/* 导航栏 */}
      <NavBar />


  {/*     页面内容    */}
  <main className="flex-1 container mx-auto p-4">
    <Routes>
      {/* 默认跳转到 FCC 管理页 */}
      <Route path="/" element={<Navigate to="/fccs" replace />} />

      {/* 登录页 */}
      <Route path="/login" element={<LoginPage />} />

      {/* FCC 管理页 - 需要 admin 或 editor 权限 */}
      <Route
        path="/fccs"
        element={
        //  <RequireAuth allowedRoles={['admin', 'editor']}>
            <FccManagement />
        //  </RequireAuth>
        }
      />

      {/* 产品管理页 - 仅 admin 可访问
      <Route
        path="/products"
        element={
          <RequireAuth allowedRoles={['admin']}>
            <ProductManagement />
          </RequireAuth>
        }

      />
        */}
      {/* 无权限页面 */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* 404 跳转登录 */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </main>


    </div>
  );
}
