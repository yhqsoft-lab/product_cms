// src/components/NavBar.jsx
import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useUser } from '../context/useUser'; // ✅ 1. 引入 useUser

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ 2. 解构出真正的退出函数
  const { logout } = useUser();

  // 判断当前页面
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-indigo-600 sm:bg-gradient-to-r sm:from-indigo-600 sm:to-purple-600 shadow-md sticky top-0 z-50 border-b border-gray-200">
      <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between">
        <h1 className="text-2xl font-bold text-white text-center md:text-left mb-4 md:mb-0">
          管理中心
        </h1>

        <div className="flex flex-wrap items-center gap-4">

          {/* 前台访问 */}
          <button
            onClick={() => navigate('/productview')}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            前台
          </button>

          {/* FCCID管理 */}
          <Link
            to="/fccs"
            className={`transition-colors ${
              isActive('/fccs')
                ? 'text-yellow-300 font-bold'
                : 'text-white hover:text-yellow-300'
            }`}
          >
            FCCID管理
          </Link>

          {/* 产品管理 */}
          <Link
            to="/products"
            className={`transition-colors ${
              isActive('/products')
                ? 'text-green-300 font-bold'
                : 'text-white hover:text-green-300'
            }`}
          >
            产品管理
          </Link>

          {/* 🚀 彻底修复：调用真正的 logout 函数清空 Token 并退出 */}
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            退出
          </button>
        </div>
      </div>
    </nav>
  );
}
