// components/RequireAuth.jsx

import React from 'react';
import { Navigate } from 'react-router-dom';

import { UserContext } from '../context/UserContext'; // 确保能获取用户状态

export default function RequireAuth({ children, allowedRoles }) {
  const { user } = UserContext();

  if (!user) {
    // 未登录 → 跳转登录页
    return <Navigate to="/login" replace />;
  }

  // ✅ 允许 admin 访问所有页面
//  if (user.role === 'admin') {
//    return children;
//  }

  // ✅ 检查当前用户是否有权限访问该页面
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
