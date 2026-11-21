import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ProductCatalog() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  // 获取产品列表
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = searchTerm
          ? `/api/products?search=${encodeURIComponent(searchTerm)}`
          : '/api/products';

        const res = await fetch(url);
        if (!res.ok) throw new Error('无法加载产品数据');
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchTerm]);

  // 处理搜索
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // 查看产品详情
  const viewProductDetail = (id) => {
    navigate(`/product/${id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">产品目录</h1>
              <p className="text-gray-600 text-sm mt-1">浏览所有可用产品信息</p>
            </div>

            <div className="relative w-full max-w-xl">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索型号、品牌或描述..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full px-4 py-2 pl-10 pr-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />

                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* 状态提示 */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 mr-3"></div>
            <span className="text-gray-600">加载产品中...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-700 mb-2">加载失败：{error}</p>
            <button
              onClick={() => setSearchTerm('')}
              className="text-indigo-600 hover:text-indigo-800 text-sm"
            >
              重试
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.478-.83-6.291-2.109L18 6.207 6.207 18" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">暂无产品</h3>
            <p className="text-gray-600">当前目录中没有任何产品记录</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

          {products.map((product) => (
<div
  key={product.id}
  className="bg-white rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-shadow duration-300 overflow-hidden"
>

  {/* 上半部分：产品基本信息 */}
  <div className="p-6">
    <h2 className="text-2xl font-bold text-gray-800 mb-2">
      Model: {product.model}
      SKU: {product.sku || '暂无'}
    </h2>

    <div className="flex flex-wrap gap-2 text-sm text-gray-600">
      {product.brand && (
        <span className="bg-gray-100 px-2 py-1 rounded">
          品牌: {product.brand}
        </span>
      )}
      {product.productType && (
        <span className="bg-gray-100 px-2 py-1 rounded">
          类型: {product.productType}
        </span>
      )}
      <span className="bg-gray-100 px-2 py-1 rounded">
        ID: {product.id}
      </span>
    </div>
  </div>

  {/* 下半部分：左侧图片 + 右侧详细信息 */}
  <div className="flex flex-col md:flex-row">
  {/* 左侧：图片 */}
  <div className="md:w-1/2 p-6 flex items-center justify-center">
    <img
      src={`${product.image}`}
      alt={product.model}
      className="w-full max-w-xs h-64 object-cover rounded-lg"
      onError={(e) => {
        // ✅ 修正：移除 URL 末尾空格
        e.target.src = 'https://picsum.photos/300/200?random=123';
      }}
    />
  </div>

    {/* 右侧：详细文字信息 */}
    <div className="md:w-1/2 p-6 min-w-0"> {/* ✅ 添加 min-w-0 */}
    {/* 描述 */}
  <div className="mb-6">
    <h2 className="text-lg font-semibold text-gray-800 mb-2">产品描述</h2>
    <p
      className="text-gray-600 mb-1 break-words max-w-prose"
      style={{
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        wordBreak: 'break-word',
        hyphens: 'auto'
      }}
    >
      {product.description || '暂无描述'}
    </p>
  </div>

      {/* 产品链接 (原 httpLink) */}
      {product.httpLink && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">产品链接</h2>
          <a
            href={product.httpLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800 break-words"
          >
            {product.httpLink}
          </a>
        </div>
      )}

      {/* Manual 链接 */}
      {product.manual && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Manual</h2>
          <a
            href={product.manual}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800 break-words"
          >
            {product.manual}
          </a>
        </div>
      )}

      {/* Work With 链接 */}
      {product.workwith && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Work With</h2>
          <a
            href={product.workwith}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800 break-words"
          >
            {product.workwith}
          </a>
        </div>
      )}

      {/* 元数据：时间 */}
      <div className="pt-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">详细信息</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">创建时间：</span>
            <span className="text-gray-800">
              {new Date(product.createdAt).toLocaleString('zh-CN')}
            </span>
          </div>
          <div>
            <span className="text-gray-500">更新时间：</span>
            <span className="text-gray-800">
              {new Date(product.updatedAt).toLocaleString('zh-CN')}
            </span>
          </div>
        </div>
      </div>
    {/* 元数据：时间结束 */}

    </div>
    {/* 右侧：详细文字信息结束 */}

  </div>
      {/* 中间信息结束 */}
      {/* 描述 */}
    <div className="mb-6">
        {/*<h2 className="text-lg font-semibold text-gray-800 mb-2">产品描述</h2>*/}
      <p
        className="text-gray-600 mb-1 break-words max-w-prose"

        style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          wordBreak: 'break-word',
          hyphens: 'auto'
        }}
      >
        <span className="font-medium text-gray-700">产品描述：</span>
        {product.description || '暂无描述'}
      </p>
    </div>

</div>

))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-5">
        <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
          <p>© 2025 产品中心 | 所有产品信息来源于数据库</p>
        </div>
      </footer>
    </div>
  );
}
