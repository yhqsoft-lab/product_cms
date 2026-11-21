import React, { useEffect, useState, useCallback } from 'react';

// ✅ 优化：提取统一的图片处理组件
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

export default function ProductManagement() {
  // 页面状态
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searching, setSearching] = useState(false);

  // Relations 状态 (保留查看功能)
  const [showApplicableModal, setShowApplicableModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showReplacementModal, setShowReplacementModal] = useState(false);
  const [selectedProductForView, setSelectedProductForView] = useState(null);

  // 文件与表单状态
  const [imageFile, setImageFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [newProduct, setNewProduct] = useState({
    sku: '', productType: '', description: '', brand: '', model: '', httpLink: '', manual: ''
  });

  const BASE_URL = 'http://localhost:5000';
  const API_PRODUCTS = `${BASE_URL}/api/products`;

  const brandOptions = [
    { value: '', label: '请选择品牌' },
    { value: 'Hunter', label: 'Hunter' },
    { value: 'Harbor Breeze', label: 'Harbor Breeze' },
    { value: 'Hampton Bay', label: 'Hampton Bay' },
    { value: 'CoreBay', label: 'CoreBay' },
    { value: 'Others', label: '其他' }
  ];

  const productTypeOptions = [
    { value: '', label: '请选择产品类型' },
    { value: 'Ceiling Fan', label: 'Ceiling Fan' },
    { value: 'Control Kit', label: 'Control Kit' },
    { value: 'Remote', label: 'Remote' },
    { value: 'Receiver', label: 'Receiver' },
    { value: 'Others', label: '其他' }
  ];

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

  // ✅ 修复：加入 AbortController 防止竞态条件
  const fetchProducts = useCallback(async (search = '', signal) => {
    setLoading(true);
    setError(null);
    try {
      const url = search ? `${API_PRODUCTS}?search=${encodeURIComponent(search)}` : API_PRODUCTS;
      const res = await fetch(url, { signal });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
        setProducts([]);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setSearching(false);
      }
    }
  }, [API_PRODUCTS]);

  useEffect(() => {
    fetchAllProducts();
  }, [fetchAllProducts]);

  useEffect(() => {
    const controller = new AbortController();
    if (searchTerm.trim() === '') {
      fetchProducts('', controller.signal);
    } else {
      setSearching(true);
      const timer = setTimeout(() => {
        fetchProducts(searchTerm, controller.signal);
      }, 500);
      return () => { clearTimeout(timer); controller.abort(); };
    }
    return () => controller.abort();
  }, [searchTerm, fetchProducts]);

  const checkUniqueField = useCallback(async (field, value) => {
    if (!value) return '';
    try {
      const params = new URLSearchParams({ [field]: value });
      const res = await fetch(`/api/products/check-unique?${params}`);
      const data = await res.json();
      if (!data.unique) return field === 'sku' ? 'SKU 已存在' : '型号已存在';
    } catch (err) {
      console.error(`校验 ${field} 失败:`, err);
    }
    return '';
  }, []);

  const handleSearchChange = (e) => setSearchTerm(e.target.value);

  const clearSearch = () => {
    setSearchTerm('');
    fetchProducts();
  };

  const handleImageChange = (e) => {
    const file = e.target.files;
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('请上传 JPG、PNG、GIF 或 WebP 格式的图片');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('图片不能超过 5MB');
      e.target.value = '';
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.onerror = () => {
      alert('图片读取失败');
      setImageFile(null);
      setPreview('');
    };
    reader.readAsDataURL(file);
  };

  const handlePdfChange = (e) => {
    const file = e.target.files;
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('请上传 PDF 文件');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('PDF 文件不能超过 5MB');
      e.target.value = '';
      return;
    }
    setPdfFile(file);
  };

  const toggleModal = () => {
    setShowModal(!showModal);
    setFormErrors({});
    setNewProduct({ sku: '', productType: '', description: '', brand: '', model: '', httpLink: '', manual: '' });
    setPreview('');
    setImageFile(null);
    setPdfFile(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: null }));
  };

  const isValidUrl = (url) => {
    if (!url?.trim()) return true;
    try { new URL(url); return true; } catch (_) { return false; }
  };

  const validateForm = () => {
    const errors = {};
    if (!newProduct.sku?.trim()) errors.sku = 'SKU不能为空';
    if (!newProduct.model?.trim()) errors.model = 'Model不能为空';
    if (!newProduct.brand) errors.brand = '请选择品牌';
    if (!newProduct.productType) errors.productType = '请选择产品类型';
    if (newProduct.httpLink && !isValidUrl(newProduct.httpLink)) {
      errors.httpLink = '请输入有效的URL链接';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || isSubmitting) return;
    setIsSubmitting(true);

    const skuErrMsg = await checkUniqueField('sku', newProduct.sku);
    const modelErrMsg = await checkUniqueField('model', newProduct.model);
    if (skuErrMsg || modelErrMsg) {
      setFormErrors(prev => ({ ...prev, ...(skuErrMsg && {sku: skuErrMsg}), ...(modelErrMsg && {model: modelErrMsg}) }));
      alert('请修正重复的 SKU 或型号');
      setIsSubmitting(false);
      return;
    }

    const hasNewFiles = imageFile || pdfFile;

    try {
      let response;
      if (hasNewFiles) {
        const formData = new FormData();
        formData.append('sku', newProduct.sku);
        formData.append('model', newProduct.model);
        formData.append('description', newProduct.description);
        formData.append('brand', newProduct.brand);
        formData.append('productType', newProduct.productType);
        if (newProduct.httpLink?.trim()) formData.append('httpLink', newProduct.httpLink.trim());
        if (imageFile) formData.append('image', imageFile);
        if (pdfFile) formData.append('manual', pdfFile);

        response = await fetch(API_PRODUCTS, {
          method: 'POST',
          body: formData,
        });
      } else {
        const jsonData = {
          sku: newProduct.sku, model: newProduct.model, description: newProduct.description,
          brand: newProduct.brand, productType: newProduct.productType,
        };
        if (newProduct.httpLink?.trim()) jsonData.httpLink = newProduct.httpLink.trim();

        response = await fetch(API_PRODUCTS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jsonData),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}`;
        try { errorMessage = JSON.parse(errorText).message || errorMessage; } catch { errorMessage = errorText.substring(0, 200); }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setProducts(prev => [data, ...prev]);
      alert('产品添加成功');

      toggleModal();
      fetchAllProducts();
    } catch (err) {
      console.error('💥 提交失败:', err);
      alert(`操作失败: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRelationModal = (isOpen, onClose, title, relatedProducts) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl w-full max-w-xl max-h-[80vh] overflow-y-auto shadow-2xl">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="p-6">
            {relatedProducts.length > 0 ? (
              <div className="space-y-3">
                {relatedProducts.map((p) => (
                  <div key={p.id} className="flex items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-14 h-14 bg-gray-100 rounded mr-4 overflow-hidden flex-shrink-0">
                      <ImageWithFallback src={formatImageUrl(p.image, BASE_URL)} alt={p.model} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{p.model}</p>
                      <p className="text-sm text-gray-500">{p.brand} · {p.productType}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">暂无相关产品</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getRelatedProducts = (ids) => {
    if (!ids || !Array.isArray(ids)) return [];
    return ids.map(id => allProducts.find(p => p.id === id)).filter(p => p);
  };

  const renderProductList = () => {
    if (loading) {
      return (
        <div className="flex flex-col justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600 font-medium">加载产品数据中...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-16 bg-red-50 rounded-xl border border-red-100">
          <svg className="w-12 h-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-700 mb-4">数据加载失败：{error}</p>
          <button onClick={() => fetchProducts(searchTerm)} className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">重试</button>
        </div>
      );
    }

    if (products.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
             <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-medium text-gray-800 mb-2">{searchTerm ? '未找到相关产品' : '暂无产品'}</h2>
          <p className="text-gray-500 text-center mb-6">{searchTerm ? '换个关键词试试吧' : '开始添加您的第一个产品'}</p>
          {!searchTerm && (
            <button onClick={toggleModal} className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm">添加产品</button>
          )}
        </div>
      );
    }

    // ✅ 采用纯粹的上下垂直布局以适应响应式 Grid 容器
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <div key={product.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
            {/* 上半部分：固定高度的图片展示区 */}
            <div className="relative h-56 bg-gray-50 border-b border-gray-100">
              <ImageWithFallback
                src={formatImageUrl(product.image, BASE_URL)}
                alt={product.model}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 flex flex-col gap-2">
                 {product.sku && <span className="px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-xs rounded-md shadow-sm font-mono">SKU: {product.sku}</span>}
                 {product.productType && <span className="px-2 py-1 bg-indigo-600/80 backdrop-blur-sm text-white text-xs rounded-md shadow-sm">{product.productType}</span>}
              </div>
            </div>

            {/* 下半部分：文本与操作区域 */}
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-bold text-gray-900 text-lg truncate" title={product.model}>{product.model}</h3>
                <span className="px-2.5 py-0.5 bg-green-100 text-green-800 text-xs rounded-full whitespace-nowrap ml-2">{product.brand || '未知'}</span>
              </div>
              <p className="text-gray-500 text-sm mb-4 line-clamp-2 min-h-[40px]">{product.description || '暂无描述'}</p>

              {/* 关系链接指示器 */}
              <div className="flex flex-wrap gap-2 mb-4">
                 {product.compatibleIds?.length > 0 && (
                  <button onClick={() => { setSelectedProductForView(product); setShowApplicableModal(true); }} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors">
                    可匹配 ({product.compatibleIds.length})
                  </button>
                 )}
                 {product.upgradeIds?.length > 0 && (
                  <button onClick={() => { setSelectedProductForView(product); setShowUpgradeModal(true); }} className="text-xs px-2 py-1 bg-orange-50 text-orange-600 rounded hover:bg-orange-100 transition-colors">
                    升级款 ({product.upgradeIds.length})
                  </button>
                 )}
                 {product.replacementIds?.length > 0 && (
                  <button onClick={() => { setSelectedProductForView(product); setShowReplacementModal(true); }} className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded hover:bg-purple-100 transition-colors">
                    可替换 ({product.replacementIds.length})
                  </button>
                 )}
              </div>

              {/* 操作按钮组 (已移除编辑、删除、管理关系) */}
              <div className="mt-auto pt-4 border-t border-gray-100 grid grid-cols-1">
                <button onClick={() => { setSelectedProduct(product); setShowDetailModal(true); }} className="py-2 bg-gray-50 text-indigo-600 rounded-lg hover:bg-indigo-50 text-sm font-medium transition-colors border border-gray-200 hover:border-indigo-200">
                  查看详情
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-100">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-indigo-600">产品信息查询</h1>
          <div className="relative w-full max-w-xl md:mx-8">
            <div className="relative">
              <input
                type="text"
                placeholder="输入SKU或Model搜索产品..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                disabled={loading}
              />
              {searching && (
                <div className="absolute right-3 top-2.5">
                  <div className="animate-spin h-4 w-4 border-t-2 border-b-2 border-indigo-600 rounded-full"></div>
                </div>
              )}
              {searchTerm && !searching && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  ✕
                </button>
              )}
            </div>
            {searching && (
              <p className="absolute text-xs text-gray-500 mt-1">正在搜索...</p>
            )}
          </div>
          <button onClick={toggleModal} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors flex items-center justify-center whitespace-nowrap font-medium" disabled={loading}>
             <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
             添加产品
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1">
        {searchTerm && !loading && (
          <div className="mb-6 text-sm text-gray-600 bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-100 inline-block">
            搜索 <span className="font-semibold text-gray-900">"{searchTerm}"</span> 的结果（共 {products.length} 个）
          </div>
        )}
        {renderProductList()}
      </main>

      <footer className="bg-white border-t border-gray-200 py-6 mt-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} 产品中心 | 内部管理系统</p>
          <p className="mt-2 md:mt-0">总计加载 {products.length} 个产品数据</p>
        </div>
      </footer>

      {/* 新增产品模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-800">添加新产品</h2>
              <button onClick={toggleModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">SKU <span className="text-red-500">*</span></label>
                    <input type="text" name="sku" value={newProduct.sku} onChange={handleInputChange} className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${formErrors.sku ? 'border-red-400' : 'border-gray-200'}`} placeholder="请输入唯一SKU" />
                    {formErrors.sku && <p className="text-red-500 text-xs mt-1.5">{formErrors.sku}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Model (型号) <span className="text-red-500">*</span></label>
                    <input type="text" name="model" value={newProduct.model} onChange={handleInputChange} className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${formErrors.model ? 'border-red-400' : 'border-gray-200'}`} placeholder="请输入型号" />
                    {formErrors.model && <p className="text-red-500 text-xs mt-1.5">{formErrors.model}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">所属品牌 <span className="text-red-500">*</span></label>
                    <select name="brand" value={newProduct.brand} onChange={handleInputChange} className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${formErrors.brand ? 'border-red-400' : 'border-gray-200'}`}>
                      {brandOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    {formErrors.brand && <p className="text-red-500 text-xs mt-1.5">{formErrors.brand}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">产品类别 <span className="text-red-500">*</span></label>
                    <select name="productType" value={newProduct.productType} onChange={handleInputChange} className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${formErrors.productType ? 'border-red-400' : 'border-gray-200'}`}>
                      {productTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    {formErrors.productType && <p className="text-red-500 text-xs mt-1.5">{formErrors.productType}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">产品链接 (官网URL)</label>
                    <input type="url" name="httpLink" value={newProduct.httpLink} onChange={handleInputChange} className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${formErrors.httpLink ? 'border-red-400' : 'border-gray-200'}`} placeholder="https://..." />
                    {formErrors.httpLink && <p className="text-red-500 text-xs mt-1.5">{formErrors.httpLink}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">描述信息</label>
                    <textarea name="description" value={newProduct.description} onChange={handleInputChange} rows="3" className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${formErrors.description ? 'border-red-400' : 'border-gray-200'}`} placeholder="输入详细的产品描述..."></textarea>
                  </div>

                  {/* 文件上传区域 */}
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">产品主图</label>
                      <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm font-medium">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span>选择图片</span>
                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                      </label>
                      <p className="text-xs text-gray-400 mt-2">支持 JPG/PNG/WEBP, 最大 5MB</p>

                      {preview && (
                        <div className="mt-4 relative inline-block">
                          <img src={preview} alt="预览" className="w-32 h-32 object-cover rounded-lg border border-gray-200 shadow-sm" />
                          <button type="button" onClick={() => { setPreview(''); setImageFile(null); setNewProduct(prev => ({ ...prev, image: null, _hasImage: false })); }} className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">PDF 说明书</label>
                      <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm font-medium">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <span>选择文件</span>
                        <input type="file" accept=".pdf" onChange={handlePdfChange} className="hidden" />
                      </label>
                      <p className="text-xs text-gray-400 mt-2">支持 PDF 格式, 最大 5MB</p>

                      {pdfFile && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
                          <span className="text-sm text-blue-800 truncate font-medium mr-2">{pdfFile.name}</span>
                          <button type="button" onClick={() => setPdfFile(null)} className="text-blue-400 hover:text-blue-600 p-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
              <button type="button" onClick={toggleModal} className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors">取消</button>
              <button type="submit" form="product-form" disabled={isSubmitting} className="px-8 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-sm transition-colors flex items-center disabled:opacity-70 disabled:cursor-not-allowed">
                {isSubmitting ? <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>处理中</> : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 模态框组 */}
      {renderRelationModal(showApplicableModal, () => setShowApplicableModal(false), '可匹配的产品 (Compatible)', selectedProductForView?.compatibleIds ? getRelatedProducts(selectedProductForView.compatibleIds) : [])}
      {renderRelationModal(showUpgradeModal, () => setShowUpgradeModal(false), '升级款推荐 (Upgrade)', selectedProductForView?.upgradeIds ? getRelatedProducts(selectedProductForView.upgradeIds) : [])}
      {renderRelationModal(showReplacementModal, () => setShowReplacementModal(false), '可替代的产品 (Replacement)', selectedProductForView?.replacementIds ? getRelatedProducts(selectedProductForView.replacementIds) : [])}

      {/* 产品详情模态框 */}
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
                  <p className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-gray-900">{selectedProduct.model || '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">SKU</label>
                  <p className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-gray-900 font-mono">{selectedProduct.sku || '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">品牌 (Brand)</label>
                  <p className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-gray-900">{selectedProduct.brand || '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">产品类型</label>
                  <p className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-gray-900">{selectedProduct.productType || '—'}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">描述信息</label>
                <p className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-gray-900 min-h-[80px] whitespace-pre-wrap leading-relaxed">
                  {selectedProduct.description || '—'}
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
                      <span className="text-gray-400">—</span>
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
                      <span className="text-gray-400">无说明书</span>
                    )}
                  </div>
                </div>
              </div>

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
                    <span className="text-gray-400">无图片</span>
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
