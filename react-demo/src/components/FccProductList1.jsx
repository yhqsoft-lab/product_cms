// src/components/FccProductList.jsx
import React from 'react';

export default function FccProductList({ products, loading, error, onRemove }) {
  // ✅ 绝对安全的数组处理 - 双重保障
  const safeProducts = Array.isArray(products) ? products : [];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-red-500">
        <p>数据加载失败：{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  if (safeProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h2 className="text-xl font-medium text-gray-800 mb-2">没有关联产品</h2>
        <p className="text-gray-500 text-center max-w-md">
          请尝试使用其他关键词进行搜索，或清除输入框查看所有产品
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
        >
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-bold mb-2">关联产品</h3>
      <ul className="space-y-2">
        {safeProducts.map((p) => (
          <li key={p.id} className="flex justify-between items-center bg-gray-100 p-2 rounded">
            <span>{p.model} - {p.brand}</span>
            <button
              onClick={() => onRemove(p.id)}
              className="text-red-500 hover:text-red-700"
            >
              删除1111111
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
