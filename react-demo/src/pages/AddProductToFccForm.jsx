//import React, { useState, useEffect } from 'react';
import React, { useState, useEffect, useMemo } from 'react';


export default function AddProductToFccForm({
  fccId,
  onAdd,
  availableProducts,     // 👈 由父组件传入
  filteredAvailableProducts // 👈 由父组件计算好
}) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [associateLoading, setAssociateLoading] = useState(false);
  const [error, setError] = useState('');
  // ✅ API 地址
const API_URL = '';
  const handleAssociateProduct = async () => {
    if (!selectedProductId) {
      alert('请选择要关联的产品');
      return;
    }

    setAssociateLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/fccs/${fccId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProductId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.code === 'ALREADY_ASSOCIATED') {
          alert('该产品已关联，不能重复添加');
        } else {
          alert('关联失败: ' + errorData.message);
        }
        return;
      }

      // 成功后通知父组件刷新
      if (onAdd) onAdd();
      setSelectedProductId('');
      alert('产品关联成功！');

    } catch (err) {
      setError('关联失败，请稍后重试');
    } finally {
      setAssociateLoading(false);
    }
  };

  // 🖼️ 根据截图设计 UI —— 两栏布局，左侧关联，右侧已关联
  return (
    <div className="mt-6 flex flex-col lg:flex-row gap-6">
      {/* 左侧：关联新产品 */}
      <div className="lg:w-1/2 bg-white p-4 rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-bold mb-4 text-gray-800">关联新产品</h3>

        {/* 错误提示区（如果存在） */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* 产品选择下拉框 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            选择产品：
          </label>
          <select
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">-- 请选择产品 --</option>
          {filteredAvailableProducts.map((product) => (
            <option key={product.id} value={product.id}>
              {product.model} - {product.brand}
            </option>
          ))}
        </select>
        </div>


        {/* 关联按钮 */}
        <button
          onClick={handleAssociateProduct}
          disabled={!selectedProductId || associateLoading}
          className={`w-full px-4 py-2 rounded-md font-medium transition-colors ${
            selectedProductId && !associateLoading
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {associateLoading ? '关联中...' : '关联产品'}
        </button>
      </div>


    </div>
  );
}
