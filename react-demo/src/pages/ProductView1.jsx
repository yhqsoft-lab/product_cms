import React, { useEffect, useState, useCallback } from 'react';

// ✅ 提取统一的图片处理组件，用于优雅地处理图片和默认图
const formatImageUrl = (img, baseUrl) => {
  if (!img || img === 'null' || img === 'undefined') return null;
  if (img.startsWith('http') || img.startsWith('data:')) return img;
  return `${baseUrl}${img.startsWith('/') ? img : '/' + img}`;
};

const ImageWithFallback = ({ src, alt, className, fallbackText = "无图片" }) => {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center text-gray-400 ${className}`}>
        <div className="text-center flex flex-col items-center">
          <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-medium">{fallbackText}</span>
        </div>
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setError(true)} loading="lazy" />;
};

export default function ProductSearch() {
  // 页面状态
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]); // 用于 relations 下拉选项或弹窗展示
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searching, setSearching] = useState(false);

  // 关系查看状态
  const [showApplicableModal, setShowApplicableModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showReplacementModal, setShowReplacementModal] = useState(false);
  const [selectedProductForView, setSelectedProductForView] = useState(null);

  // 详情模态框状态
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // API 地址
  const BASE_URL = 'http://localhost:5000'; // 根据实际后端地址修改
  const API_PRODUCTS = `${BASE_URL}/api/products`;

  // 获取所有产品（用于关联产品的信息显示）
  const fetchAllProducts = useCallback(async () => {
    try {
      const res = await fetch(API_PRODUCTS);
      if (!res.ok) throw new Error('获取产品列表失败');
      const data = await res.json();
      setAllProducts(data);
    } catch (err) {
      console.error('获取所有产品失败:', err);
    }
  }, [API_PRODUCTS]);

  // 获取产品数据（带搜索）
  const fetchProducts = useCallback(async (search = '') => {
    setLoading(true);
    setError(null);
    try {
      const url = search
        ? `${API_PRODUCTS}?search=${encodeURIComponent(search)}`
        : API_PRODUCTS;

      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error('❌ 获取产品失败:', err);
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, [API_PRODUCTS]);

  // 初始化加载
  useEffect(() => {
    fetchProducts();
    fetchAllProducts();
  }, [fetchProducts, fetchAllProducts]);

  // 防抖搜索
  useEffect(() => {
    if (searchTerm.trim() === '') {
      fetchProducts();
      return;
    }

    setSearching(true);
    const timer = setTimeout(() => {
      fetchProducts(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, fetchProducts]);

  // 搜索输入处理
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (value.trim() === '') {
      setSearching(false);
    }
  };

  // 清除搜索
  const clearSearch = () => {
    setSearchTerm('');
    fetchProducts();
  };

  // 获取产品图片 URL
  const getProductImageUrl = (product) => {
    if (!product.image || product.image === 'null' || product.image === 'undefined') {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSIxNTAiIHk9IjEwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2Ij5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
    }
    if (product.image.startsWith('http') || product.image.startsWith('data:')) {
      return product.image;
    }
    return `${BASE_URL}${product.image.startsWith('/') ? product.image : '/' + product.image}`;
  };

  // 处理图片加载错误
  const handleImageError = (e) => {
    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmNWY1ZjUiLz48dGV4dCB4PSIxNTAiIHk9IjEwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5Ij5JbWFnZSBFcnJvcjwvdGV4dD48L3N2Zz4=';
    e.target.onerror = null;
  };

  // 获取关联产品对象数组
  const getRelatedProducts = (ids) => {
    if (!ids || !Array.isArray(ids)) return [];
    return ids
      .map(id => allProducts.find(p => p.id === id))
      .filter(p => p);
  };

  // 渲染关系查看模态框
  const renderRelationModal = (isOpen, onClose, title, relatedProducts) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6">
            {relatedProducts.length > 0 ? (
              <div className="space-y-4">
                {relatedProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      onClose();
                      const target = document.getElementById(`product-${p.id}`);
                      if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        target.classList.add('ring-2', 'ring-indigo-400');
                        setTimeout(() => target.classList.remove('ring-2', 'ring-indigo-400'), 2000);
                      }
                    }}
                  >
                    <div className="w-12 h-12 bg-gray-100 rounded mr-4 overflow-hidden flex-shrink-0">
                      <img
                        src={getProductImageUrl(p)}
                        alt={p.model}
                        className="w-full h-full object-cover"
                        onError={handleImageError}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{p.model || '无'}</p>
                      <p className="text-sm text-gray-600">{p.brand || '无'} · {p.productType || '无'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">无相关产品</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 渲染产品列表
  const renderProductList = () => {
    if (loading) {
      return (
        <div className="flex flex-col justify-center items-center py-16">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600">加载产品数据中...</p>
          <p className="text-sm text-gray-500 mt-2">请稍候</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-red-500">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-red-700 mb-3">数据加载失败：{error}</p>
          <button
            onClick={() => fetchProducts(searchTerm)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            重试
          </button>
        </div>
      );
    }

    if (products.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <svg className="w-16 h-16 text-gray-400 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h2 className="text-xl font-medium text-gray-700 mb-2">
            {searchTerm ? '未找到相关产品' : '无数据'}
          </h2>
          <p className="text-gray-500 text-center max-w-md mb-6">
            {searchTerm
              ? `没有找到包含"${searchTerm}"的产品，请尝试其他关键词。`
              : '当前库中没有任何产品信息'
            }
          </p>
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              查看所有产品
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => {
          return (
            <div
              id={`product-${product.id}`}
              key={product.id}
              className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col"
            >
              {/* 上半部分：左右布局 */}
              <div className="flex flex-col md:flex-row h-full">
                {/* 左侧：图片 */}
                <div className="w-full md:w-1/2 relative">
                  <div className="h-64 md:h-full bg-gray-100 overflow-hidden">
                    <ImageWithFallback
                      src={formatImageUrl(product.image, BASE_URL)}
                      alt={product.model || '无图片'}
                      className="w-full h-full object-cover"
                    />
                    {/* SKU */}
                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                      {'SKU: '}{product.sku || '无'}
                    </div>
                    {/* TYPE */}
                    <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                      {product.productType || '类型: 无'}
                    </div>
                     {/* Brand */}
                     <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-xs rounded shadow-sm">
                      {product.brand || '类型: 无'}
                    </div>

                    {/* Status (居中显示) */}
                   <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-xs rounded shadow-sm">
                   {!product.status ? '无' : product.status === 'active' ? '在售' : product.status === 'discontinued' ? '停产' : '开发中'}
                  </div>
                  </div>
                </div>

                {/* 右侧：基本信息 */}
                <div className="w-full md:w-1/2 p-4 md:p-6  ">
                  {/* 第一行：ID */}
                  <div className="mb-4">
                   {/*
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-full">

                        <span className="text-gray-600 break-words block mt-1">Model:{product.model || '无'}</span>
                      </span>
                    </div>
                   */}


                    {/* 品牌和状态 */}


                    <div className="flex flex-wrap gap-2 mb-2">
                    {/*   <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full whitespace-nowrap">
                        品牌: {product.brand || '无'}
                      </span>

                          <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full whitespace-nowrap">Model:{product.model || '无'}</span>
                     */}
                     {/*
                      <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full whitespace-nowrap">
                        状态: {!product.status ? '无' : product.status === 'active' ? '在售' : product.status === 'discontinued' ? '停产' : '开发中'}
                      </span>
                      */}
                    </div>
                  </div>

                  {/* 链接部分 */}
                  <div className="space-y-3 mt-auto">
                  <div className="flex flex-wrap gap-2 mb-2">
                  {/*   <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full whitespace-nowrap">
                      品牌: {product.brand || '无'}
                    </span>
                  */}
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full whitespace-nowrap">Model:{product.model || '无'}</span>

                   {/*
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full whitespace-nowrap">
                      状态: {!product.status ? '无' : product.status === 'active' ? '在售' : product.status === 'discontinued' ? '停产' : '开发中'}
                    </span>
                    */}
                  </div>
                    <div className="flex flex-col space-y-2 mt-2">



                      {/* 产品链接 */}
                      <div>
                        {product.httpLink ? (
                          <a
                            href={product.httpLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm truncate flex items-center"
                            title={product.httpLink}
                          >
                            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            产品链接
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm flex items-center">
                            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            产品链接: 无
                          </span>
                        )}
                      </div>

                      {/* Manual 链接 */}
                      <div>
                        {product.manual ? (
                          <a
                            href={formatImageUrl(product.manual, BASE_URL)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm truncate flex items-center"
                          >
                            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            说明书
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm flex items-center">
                            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            说明书: 无
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 可匹配/可替换链接 */}
                    <div className="flex flex-col space-y-2 mt-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (product.compatibleIds?.length > 0) {
                            setSelectedProductForView(product);
                            setShowApplicableModal(true);
                          }
                        }}
                        disabled={!product.compatibleIds?.length}
                        className={`text-sm flex items-center ${product.compatibleIds?.length ? 'text-green-600 hover:text-green-800' : 'text-gray-400 cursor-not-allowed'}`}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        可匹配 ({product.compatibleIds?.length || '无'})
                      </button>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (product.upgradeIds?.length > 0) {
                            setSelectedProductForView(product);
                            setShowUpgradeModal(true);
                          }
                        }}
                        disabled={!product.upgradeIds?.length}
                        className={`text-sm flex items-center ${product.upgradeIds?.length ? 'text-green-600 hover:text-green-800' : 'text-gray-400 cursor-not-allowed'}`}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        升级款 ({product.upgradeIds?.length || '无'})
                      </button>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (product.replacementIds?.length > 0) {
                            setSelectedProductForView(product);
                            setShowReplacementModal(true);
                          }
                        }}
                        disabled={!product.replacementIds?.length}
                        className={`text-sm flex items-center ${product.replacementIds?.length ? 'text-purple-600 hover:text-purple-800' : 'text-gray-400 cursor-not-allowed'}`}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        可替换 ({product.replacementIds?.length || '无'})
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 下部分：描述和操作按钮 */}
              <div className="border-t border-gray-200 p-4 md:p-6 bg-white flex-1 flex flex-col">
                <div className="mb-4 flex-1">
                  <p className="text-gray-700 mb-2 font-medium">描述</p>
                  <div className="line-clamp-3 text-gray-600 text-sm leading-relaxed">
                    {product.description || '无'}
                  </div>
                </div>

                {/* 操作按钮 (仅保留详情) */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowDetailModal(true);
                    }}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors flex items-center text-sm font-medium w-full justify-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    查看详情
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
    {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-100">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-gray-800">产品查询</h1>

          {/* 搜索框容器 */}
          <div className="relative flex-1 max-w-xl mx-auto md:mx-4">
            <input
              type="text"
              placeholder="输入 SKU 或 Model 搜索产品..."
              value={searchTerm}
              onChange={handleSearchChange}
              // ✅ 修正：将 px-4 改为更明确的 pl-10 和 pr-10，防止输入的文字把右侧清空按钮挡住
              className="w-full py-2.5 pl-10 pr-10 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              disabled={loading && !searching}
            />

            {/* ✅ 修正 1：放大镜改回了更精致的 w-4 h-4，采用稳定的 flex 容器居中 */}
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* ✅ 加载动画 */}
            {searching && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <div className="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
              </div>
            )}

            {/* ✅ 修正 2：清空按钮使用稳定的 flex 容器，确保无论如何都在同一高度显示 */}
            {searchTerm && !searching && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  onClick={clearSearch}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none p-1"
                  disabled={loading}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>


      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* 搜索统计信息 */}
        {searchTerm && !loading && (
          <div className="mb-6 text-sm text-gray-600">
            搜索 "<span className="font-medium">{searchTerm}</span>" 的结果 ({products.length} 个)
          </div>
        )}

        {renderProductList()}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600">© {new Date().getFullYear()} 产品中心 | 所有产品信息来源于数据库</p>
            <div className="mt-2 md:mt-0 text-sm text-gray-500">
              {products.length > 0 && `当前显示 ${products.length} 个产品`}
            </div>
          </div>
        </div>
      </footer>

      {/* 可匹配/可替换模态框 */}
      {renderRelationModal(
        showApplicableModal,
        () => setShowApplicableModal(false),
        '可匹配产品',
        selectedProductForView?.compatibleIds
          ? getRelatedProducts(selectedProductForView.compatibleIds)
          : []
      )}
      {renderRelationModal(
        showUpgradeModal,
        () => setShowUpgradeModal(false),
        '升级款产品',
        selectedProductForView?.upgradeIds
          ? getRelatedProducts(selectedProductForView.upgradeIds)
          : []
      )}
      {renderRelationModal(
        showReplacementModal,
        () => setShowReplacementModal(false),
        '可替换产品',
        selectedProductForView?.replacementIds
          ? getRelatedProducts(selectedProductForView.replacementIds)
          : []
      )}

      {/* 🚀 产品详情模态框 (已应用新排版) */}
      {showDetailModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-white">
              <h2 className="text-xl font-bold text-gray-800">产品详情</h2>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-gray-50/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">型号 (Model)</label>
                  <p className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-gray-900 break-words">{selectedProduct.model || '无'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">SKU</label>
                  <p className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-gray-900 font-mono break-all">{selectedProduct.sku || '无'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">品牌 (Brand)</label>
                  <p className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-gray-900">{selectedProduct.brand || '无'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">产品类型</label>
                  <p className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-gray-900">{selectedProduct.productType || '无'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">状态</label>
                  <p className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-gray-900">
                    {!selectedProduct.status ? '无' :
                     selectedProduct.status === 'active' ? '在售' :
                     selectedProduct.status === 'discontinued' ? '停产' : '开发中'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">描述信息</label>
                <p className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-gray-900 min-h-[80px] whitespace-pre-wrap leading-relaxed">
                  {selectedProduct.description || '无'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">产品外链</label>
                  <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg truncate">
                    {selectedProduct.httpLink ? (
                      <a href={selectedProduct.httpLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {selectedProduct.httpLink}
                      </a>
                    ) : (
                      <span className="text-gray-400">无</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">说明书 (PDF)</label>
                  <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg truncate">
                    {selectedProduct.manual ? (
                      <a href={formatImageUrl(selectedProduct.manual, BASE_URL)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center">
                        查看 PDF 说明书
                      </a>
                    ) : (
                      <span className="text-gray-400">无</span>
                    )}
                  </div>
                </div>
              </div>
              {/* 🚀 新增：产品关系模块 */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">关联产品</label>
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg flex flex-col gap-5">

                  {/* 可匹配产品 */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">可匹配产品 (Compatible)</h4>
                    {selectedProduct.compatibleIds?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {getRelatedProducts(selectedProduct.compatibleIds).map(p => (
                          <span key={p.id} className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 text-sm rounded-md shadow-sm">
                            {p.model}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">无</span>
                    )}
                  </div>

                  {/* 升级款产品 */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">升级款产品 (Upgrade)</h4>
                    {selectedProduct.upgradeIds?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {getRelatedProducts(selectedProduct.upgradeIds).map(p => (
                          <span key={p.id} className="px-3 py-1 bg-orange-50 text-orange-700 border border-orange-200 text-sm rounded-md shadow-sm">
                            {p.model}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">无</span>
                    )}
                  </div>

                  {/* 可替换产品 */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">可替换产品 (Replacement)</h4>
                    {selectedProduct.replacementIds?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {getRelatedProducts(selectedProduct.replacementIds).map(p => (
                          <span key={p.id} className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 text-sm rounded-md shadow-sm">
                            {p.model}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">无</span>
                    )}
                  </div>

                </div>
              </div>

              {/* 产品图片 */}

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">产品图片</label>
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg flex justify-center items-center min-h-[200px]">
                  {selectedProduct.image ? (
                    <ImageWithFallback
                      src={formatImageUrl(selectedProduct.image, BASE_URL)}
                      alt={selectedProduct.model}
                      className="max-w-full h-auto max-h-64 object-contain rounded-md shadow-sm border border-gray-200"
                    />
                  ) : (
                    <span className="text-gray-400">无</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
