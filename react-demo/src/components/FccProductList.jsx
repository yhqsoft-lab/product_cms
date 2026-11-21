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
          当前 FCC 暂未关联任何产品
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-bold mb-4 text-gray-800">已关联产品</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                产品型号
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                品牌
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                描述
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {safeProducts.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  {product.model}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  {product.brand}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                  <div className="line-clamp-2">
                    {product.description || '-'}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <button
                    onClick={() => onRemove(product.id)}
                    className="px-3 py-1 text-xs font-medium text-red-600 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
