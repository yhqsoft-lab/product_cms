// components/NavBar.jsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // ✅ 添加 useLocation
import { Link } from 'react-router-dom';

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation(); // ✅ 获取当前路径

  // ✅ 判断当前页面
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-indigo-600 sm:bg-gradient-to-r sm:from-indigo-600 sm:to-purple-600 shadow-md sticky top-0 z-50 border-b border-gray-200">
      <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between">
        <h1 className="text-2xl font-bold text-white text-center md:text-left mb-4 md:mb-0">
          宇泉科技 Echance Tech
        </h1>

        <div className="flex flex-wrap items-center gap-4">



          {/* FCCID查询 */}
          <Link
            to="/fccview"
            className={`transition-colors ${
              isActive('/fccview')
                ? 'text-yellow-300 font-bold' // ✅ 当前页面高亮
                : 'text-white hover:text-yellow-300'
            }`}
          >
            FCCID查询
          </Link>

          {/* 产品查询 */}
          <Link
            to="/productview"
            className={`transition-colors ${
              isActive('/productview')
                ? 'text-green-300 font-bold' // ✅ 当前页面高亮
                : 'text-white hover:text-green-300'
            }`}
          >
            产品查询
          </Link>

          {/* 登录后台按钮 */}
          <button
            onClick={() => navigate('/products')}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            后台管理
          </button>
        </div>
      </div>
    </nav>
  );
}
