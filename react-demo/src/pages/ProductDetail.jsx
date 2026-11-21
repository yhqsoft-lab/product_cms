import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUser } from '../context/useUser';

export default function ProductDetail() {
  const { user, loading: isUserLoading } = useUser();
  const { id } = useParams(); // 从 URL 获取产品 ID
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 权限检查
  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, isUserLoading, navigate]);

  // 获取产品详情
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://localhost:5000/api/products/${id}`);
        if (!res.ok) throw new Error('产品未找到');
        const data = await res.json();
        setProduct(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const goBack = () => navigate(-1);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载产品详情...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-6 max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">加载失败</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={goBack}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            返回上一页
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-6 max-w-md">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.478-.83-6.291-2.109L18 6.207 6.207 18" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">产品不存在</h2>
          <button
            onClick={goBack}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center">
          <button
            onClick={goBack}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回
          </button>
          <h1 className="text-2xl font-bold text-indigo-600 ml-6">产品详情</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-4xl mx-auto">
          {/* 产品图片 */}
          <div className="relative h-64 md:h-80">
            <img
              src={`http://localhost:5000${product.image}`}
              alt={product.model}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/600x400?text=No+Image';
              }}
            />
            <div className="absolute top-4 left-4 bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-medium">
              {product.brand}
            </div>
          </div>

          {/* 产品信息 */}
          <div className="p-6 md:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{product.model}</h2>
              <div className="flex items-center text-gray-600">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8M9 4h6m-6 8h4m-2 0h0M9 16h6" />
                </svg>
                <span>{product.productType}</span>
              </div>
            </div>

            {/* 描述 */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.478-.83-6.291-2.109L18 6.207 6.207 18" />
                </svg>
                产品描述
              </h3>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                {product.description || '暂无描述'}
              </p>
            </div>

            {/* 产品链接 */}
            {product.httpLink && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0M19.428 15.428a4 4 0 01-5.656 0M9 10.586a4 4 0 000 5.657M7.086 12a4 4 0 015.656-5.656" />
                  </svg>
                  产品链接
                </h3>
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

            {/* 元数据 */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">详细信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
                <div>
                  <span className="text-gray-500">产品 ID：</span>
                  <span className="text-gray-800">#{product.id}</span>
                </div>
                <div>
                  <span className="text-gray-500">类型：</span>
                  <span className="text-gray-800">{product.productType || '未分类'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-6">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© 2025 产品中心 | 所有产品信息来源于数据库</p>
        </div>
      </footer>
    </div>
  );
}
