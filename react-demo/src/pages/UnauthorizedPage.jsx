// pages/UnauthorizedPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold text-red-600 mb-4">权限不足</h1>
      <p className="text-gray-700 mb-6">您没有访问此页面的权限</p>
      <button
        onClick={() => navigate(-1)}
        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
      >
        返回上一页
      </button>
      <button
        onClick={() => navigate('/login')}
        className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        切换账号
      </button>
    </div>
  );
}
