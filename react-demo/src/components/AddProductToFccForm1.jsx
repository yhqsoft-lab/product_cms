// src/components/AddProductToFccForm.jsx
import React, { useState, useEffect } from 'react';

export default function AddProductToFccForm({ fccId, onAdd, onCancel }) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // ✅ 严格隔离变量，避免命名冲突
  const safeSearchResults = Array.isArray(searchResults) ? searchResults : [];

  // ✅ 搜索产品（带防抖）
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/products?search=${encodeURIComponent(searchQuery)}`);
        if (!res.ok) throw new Error('API 请求失败');

        const data = await res.json();

        // ✅ 严格验证数据类型
        if (Array.isArray(data)) {
          setSearchResults(data);
        } else {
          console.error('❌ API 返回非数组数据:', data);
          setSearchResults([]);
        }
      } catch (err) {
        console.error('❌ 搜索失败:', err);
        setError(err.message);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ✅ 添加产品到 FCC
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!selectedProductId) return setError('请选择产品');

    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/fccs/${fccId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProductId })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || '添加失败');
      }

      onAdd();
      setSelectedProductId('');
      setSearchQuery('');
      setSearchResults([]);
      setError('');
      alert('产品已成功添加到 FCC');
    } catch (err) {
      setError(`添加失败: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ 选择产品
  const handleSelectProduct = (id) => {
    setSelectedProductId(id);
  };

  // ✅ 清除搜索
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setError('');
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-bold mb-4 text-gray-800">关联替代产品</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleAddProduct} className="space-y-5">
        {/* 搜索输入 */}
        <div className="relative">
          <label className="block text-gray-700 mb-2 font-medium">产品搜索</label>
          <div className="flex">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="输入产品型号/描述..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoComplete="off"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="px-3 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            )}
          </div>

          {isSearching && (
            <div className="mt-2 text-sm text-indigo-600 flex items-center">
              <div className="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full mr-2"></div>
              搜索中...
            </div>
          )}
        </div>

        {/* 产品选择 */}
        <div>
          <label className="block text-gray-700 mb-2 font-medium">选择产品</label>
          <select
            value={selectedProductId}
            onChange={(e) => handleSelectProduct(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={safeSearchResults.length === 0}
          >
            <option value="">请选择产品</option>
            {safeSearchResults.map((product) => (
              <option key={product.id} value={product.id}>
                {product.model} - {product.brand} {product.description && `(${product.description.substring(0, 30)}...)`}
              </option>
            ))}
          </select>

          {safeSearchResults.length === 0 && searchQuery && !isSearching && (
            <p className="mt-2 text-gray-500 text-sm">未找到匹配产品，请尝试其他关键词</p>
          )}
        </div>

        {/* 搜索结果预览 */}
        {safeSearchResults.length > 0 && (
          <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 font-medium text-gray-700 border-b border-gray-200">
              搜索结果 ({safeSearchResults.length})
            </div>
            <div className="max-h-48 overflow-y-auto">
              {safeSearchResults.map((product) => (
                <div
                  key={product.id}
                  className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleSelectProduct(product.id)}
                >
                  <div className="font-medium text-gray-800">{product.model}</div>
                  <div className="text-sm text-gray-600">品牌: {product.brand}</div>
                  {product.description && (
                    <div className="text-sm text-gray-500 mt-1 line-clamp-1">{product.description}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isLoading || !selectedProductId}
            className={`px-4 py-2 text-white rounded-lg transition-colors ${
              isLoading || !selectedProductId
                ? 'bg-indigo-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                添加中...
              </span>
            ) : (
              '添加产品'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
