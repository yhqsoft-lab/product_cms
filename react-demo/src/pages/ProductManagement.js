// src/pages/ProductManagement.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
// ✅ 修复 1：正确导入 useUser（路径与实际文件一致）
import { useUser } from '../context/useUser';
import ConfirmDialog from '../components/ConfirmDialog';
import ProductRelationsManager from '../components/ProductRelationsManager';
import { fetchWithAuth } from '../utils/fetchWithAuth';

export default function ProductManagement() {
  // ✅ 修复 2：正确解构 token（独立字段，不是 user.token）
  const { user, token, loading: isUserLoading } = useUser();
  const navigate = useNavigate();

  // 🔐 权限校验：等待加载完成 + 检查认证状态
  useEffect(() => {
    if (isUserLoading) return;
    // ✅ 同时检查 user 和 token，避免误判
    if (!user && !token) {
      navigate('/login', { replace: true });
    }
  }, [user, token, isUserLoading, navigate]);

  // 页面状态
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [searching, setSearching] = useState(false);

  // Relations 状态
  const [showRelationsModal, setShowRelationsModal] = useState(false);
  const [selectedProductForRelations, setSelectedProductForRelations] = useState(null);
  const [showApplicableModal, setShowApplicableModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showReplacementModal, setShowReplacementModal] = useState(false);
  const [selectedProductForView, setSelectedProductForView] = useState(null);

  // 文件状态
  const [imageFile, setImageFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [preview, setPreview] = useState('');

  // 防止重复提交
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 唯一性校验
  const [skuError, setSkuError] = useState('');
  const [modelError, setModelError] = useState('');

  // 模态框状态
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // 表单状态
  const [newProduct, setNewProduct] = useState({
    sku: '',
    productType: '',
    description: '',
    brand: '',
    model: '',
    httpLink: '',
    manual: ''
  });

  // 错误信息
  const [formErrors, setFormErrors] = useState({});

  // API 配置（仅当配置了完整 http(s) 地址时使用，否则使用同源相对路径）
  const rawApiBase = process.env.REACT_APP_API_BASE || '';
  const BASE_URL = /^https?:\/\//i.test(rawApiBase) ? rawApiBase.replace(/\/+$/, '') : '';
  const API_PRODUCTS = `${BASE_URL}/api/products`;

  // 品牌选项
  const BRAND_OPTIONS = [
    { value: '', label: '请选择品牌' },
    { value: 'Hunter', label: 'Hunter' },
    { value: 'Harbor Breeze', label: 'Harbor Breeze' },
    { value: 'Hampton Bay', label: 'Hampton Bay' },
    { value: 'CoreBay', label: 'CoreBay' },
    { value: 'Others', label: '其他' }
  ];

  // 产品类型选项
  const PRODUCT_TYPE_OPTIONS = [
    { value: '', label: '请选择产品类型' },
    { value: 'Ceiling Fan', label: 'Ceiling Fan' },
    { value: 'Control Kit', label: 'Control Kit' },
    { value: 'Remote', label: 'Remote' },
    { value: 'Receiver', label: 'Receiver' },
    { value: 'Others', label: '其他' }
  ];

  // 获取所有产品（用于 relations 下拉选项）
  const fetchAllProducts = useCallback(async () => {
    try {
      const res = await fetchWithAuth(API_PRODUCTS);
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
      const res = await fetchWithAuth(url);
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

  // 防抖校验函数
  const checkUniqueField = useCallback(async (field, value, productId = null) => {
    if (!value) return '';
    try {
      const params = new URLSearchParams({ [field]: value });
      if (productId) params.append('excludeId', productId);
      const res = await fetchWithAuth(`/api/products/check-unique?${params}`);
      const data = await res.json();
      if (!data.unique) {
        return field === 'sku' ? 'SKU 已存在' : '型号已存在';
      }
    } catch (err) {
      console.error(`校验 ${field} 失败:`, err);
    }
    return '';
  }, []);

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

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.trim() === '') setSearching(false);
  };

  const clearSearch = () => {
    setSearchTerm('');
    fetchProducts();
  };

  // 图片选择处理
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
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
    reader.onload = (event) => {
      if (event.target?.result) setPreview(event.target.result);
    };
    reader.onerror = () => {
      alert('图片读取失败');
      setImageFile(null);
      setPreview('');
    };
    reader.readAsDataURL(file);
  };

  // PDF 选择处理
  const handlePdfChange = (e) => {
    const file = e.target.files?.[0];
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

  const openRelationsModal = (product) => {
    setSelectedProductForRelations(product);
    setShowRelationsModal(true);
  };

  const closeRelationsModal = () => {
    setShowRelationsModal(false);
    setSelectedProductForRelations(null);
  };

  const toggleModal = () => {
    setShowModal(!showModal);
    setEditingProduct(null);
    setFormErrors({});
    setNewProduct({
      sku: '',
      productType: '',
      description: '',
      brand: '',
      model: '',
      httpLink: ''
    });
    setPreview('');
    setImageFile(null);
    setPdfFile(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const isValidUrl = (url) => {
    if (!url?.trim()) return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!newProduct.sku?.trim()) errors.sku = 'SKU不能为空';
    if (!newProduct.model?.trim()) errors.model = 'Model不能为空';
    if (!newProduct.brand) errors.brand = '请选择specially for品牌';
    if (!newProduct.productType) errors.productType = '请选择产品类型';
    if (newProduct.httpLink && !isValidUrl(newProduct.httpLink)) {
      errors.httpLink = '请输入有效的URL链接';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ✅ 提交表单（使用已解构的 token）
  // ✅ 替换 ProductManagement.js 中的 handleSubmit 函数
const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validateForm()) return;
  if (isSubmitting) return;
  setIsSubmitting(true);

  const hasNewFiles = imageFile || pdfFile;
  const isEditing = !!editingProduct;
  const url = isEditing ? `${API_PRODUCTS}/${newProduct.id}` : API_PRODUCTS;

  // 🔑 确保 token 存在
  if (!token) {
    alert('身份验证已过期，请重新登录');
    navigate('/login');
    return;
  }

  // 唯一性最终检查
  const isSkuUnique = !newProduct.sku || !(await checkUniqueField('sku', newProduct.sku, editingProduct?.id));
  const isModelUnique = !newProduct.model || !(await checkUniqueField('model', newProduct.model, editingProduct?.id));
  if (skuError || modelError) {
    alert('请修正重复的 SKU 或型号');
    return;
  }

  try {
    let response;
    if (hasNewFiles) {
      // 📤 有新文件：使用 multipart/form-data
      const formData = new FormData();
      formData.append('sku', newProduct.sku);
      formData.append('model', newProduct.model);
      formData.append('description', newProduct.description);
      formData.append('brand', newProduct.brand);
      formData.append('productType', newProduct.productType);
      if (newProduct.httpLink?.trim()) {
        formData.append('httpLink', newProduct.httpLink.trim());
      }
      if (imageFile) formData.append('image', imageFile);
      if (pdfFile) formData.append('manual', pdfFile);

      // ✅ 修复：弃用 fetchWithAuth，改用标准 fetch 显式携带 Token
      response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Authorization': `Bearer ${token}` }, // ⚠️ 不要手动设置 Content-Type
        body: formData,
      });
    } else {
      // 📤 无新文件：使用 JSON
      const jsonData = {
        sku: newProduct.sku,
        model: newProduct.model,
        description: newProduct.description,
        brand: newProduct.brand,
        productType: newProduct.productType,
      };
      if (newProduct.httpLink?.trim()) {
        jsonData.httpLink = newProduct.httpLink.trim();
      }

      if (isEditing) {
        if (newProduct.image === null) jsonData.image = null;
        else if (newProduct._hasImage) jsonData.image = newProduct.image;

        if (newProduct.manual === null) jsonData.manual = null;
        else if (newProduct._hasManual) jsonData.manual = newProduct.manual;
      }

      // ✅ 修复：显式携带 Content-Type 和 Authorization
      response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // ✅ 核心修复：强制注入令牌
        },
        body: JSON.stringify(jsonData),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText.substring(0, 200);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    if (isEditing) {
      setProducts(prev => prev.map(p => p.id === data.id ? data : p));
      alert('产品更新成功');
    } else {
      setProducts(prev => [data, ...prev]);
      alert('产品添加成功');
    }
    toggleModal();
    fetchProducts();
    fetchAllProducts();
  } catch (err) {
    console.error('💥 提交失败:', err);
    alert(`操作失败: ${err.message}`);
  } finally {
    setIsSubmitting(false);
  }
};

  const openEditModal = async (product) => {
    setEditingProduct(product);
    setNewProduct({ ...product });
    if (product.image) {
      const imageUrl = product.image.startsWith('http') || product.image.startsWith('data:')
        ? product.image
        : `${BASE_URL}${product.image.startsWith('/') ? product.image : '/' + product.image}`;
      setPreview(imageUrl);
    }
    setShowModal(true);
  };

  // ✅ 删除确认（使用已解构的 token）
  const confirmDelete = async () => {
    if (!deleteId) return;

    // ✅ token 已从 useUser 解构，直接使用
    if (!token) {
      alert('请先登录');
      return;
    }

    try {
      const res = await fetch(`${API_PRODUCTS}/${deleteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${res.status}`);
      }

      setProducts(prev => prev.filter(p => p.id !== deleteId));
      alert('删除成功');
      fetchProducts();
      fetchAllProducts();
    } catch (err) {
      console.error('删除失败:', err);
      alert(`删除失败: ${err.message}`);
    } finally {
      setShowDeleteDialog(false);
      setDeleteId(null);
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setShowDeleteDialog(true);
  };

  const getProductImageUrl = (product) => {
    if (!product.image || product.image === 'null' || product.image === 'undefined') {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSIxNTAiIHk9IjEwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2Ij5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
    }
    if (product.image.startsWith('http') || product.image.startsWith('data:')) {
      return product.image;
    }
    return `${BASE_URL}${product.image.startsWith('/') ? product.image : '/' + product.image}`;
  };

  const handleImageError = (e) => {
    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmNWY1ZjUiLz48dGV4dCB4PSIxNTAiIHk9IjEwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5Ij5JbWFnZSBFcnJvcjwvdGV4dD48L3N2Zz4=';
    e.target.onerror = null;
  };

  const renderRelationModal = (isOpen, onClose, title, relatedProducts) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-6">
            {relatedProducts?.length > 0 ? (
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
                      <p className="font-medium text-gray-800">{p.model}</p>
                      <p className="text-sm text-gray-600">{p.brand} · {p.productType}</p>
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
    return ids
      .map(id => allProducts.find(p => p.id === id))
      .filter(p => p);
  };

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
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-red-700 mb-3">数据加载失败：{error}</p>
          <button
            onClick={() => fetchProducts()}
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
            {searchTerm ? '未找到相关产品' : '暂无产品'}
          </h2>
          <p className="text-gray-500 text-center max-w-md mb-6">
            {searchTerm
              ? `没有找到包含 "${searchTerm}"的产品，请尝试其他关键词。`
              : '当前还没有任何产品，点击 "添加产品"按钮开始添加'
            }
          </p>
          {searchTerm ? (
            <button
              onClick={clearSearch}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              查看所有产品
            </button>
          ) : (
            <button
              onClick={toggleModal}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              添加第一个产品
            </button>
          )}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300"
          >
            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-1/2 relative">
                <div className="h-64 md:h-full bg-gray-100 overflow-hidden">
                  <img
                    src={product.image ? `${product.image}` : 'https://picsum.photos/300/200?random=123'}
                    alt={product.model || '产品图片'}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                    loading="lazy"
                  />
                  {product.sku && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                      SKU: {product.sku || '未知'}
                    </div>
                  )}
                  <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                    {product.productType || '未知TYPE'}
                  </div>
                </div>
              </div>
              <div className="w-full md:w-1/2 p-4 md:p-6">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span>
                      <span className="font-bold text-gray-900">Model: </span>
                      <span className="text-gray-600">{product.model}</span>
                    </span>
                  </div>
                  <div className="flex space-x-2 mb-4">
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                      {product.brand || '未知品牌'}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex space-x-4 mt-2">
                    {product.httpLink && (
                      <div>
                        <a
                          href={product.httpLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm truncate block inline-flex items-center"
                          title={product.httpLink}
                        >
                          <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          产品链接
                        </a>
                      </div>
                    )}
                    {product.manual && (
                      <div>
                        <a
                          href={product.manual.startsWith('http') ? product.manual : `${BASE_URL}${product.manual.startsWith('/') ? product.manual : '/' + product.manual}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm truncate block inline-flex items-center"
                        >
                          <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          说明书
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-4 mt-2">
                    {product.compatibleIds?.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedProductForView(product);
                          setShowApplicableModal(true);
                        }}
                        className="text-green-600 hover:text-green-800 text-sm inline-flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        可匹配 ({product.compatibleIds.length})
                      </button>
                    )}
                    {product.upgradeIds?.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedProductForView(product);
                          setShowUpgradeModal(true);
                        }}
                        className="text-green-600 hover:text-green-800 text-sm inline-flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        升级款 ({product.upgradeIds.length})
                      </button>
                    )}
                  </div>
                  <div className="flex space-x-4 mt-2">
                    {product.replacementIds?.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedProductForView(product);
                          setShowReplacementModal(true);
                        }}
                        className="text-purple-600 hover:text-purple-800 text-sm inline-flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        可替换 ({product.replacementIds.length})
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 p-4 md:p-6">
              <div className="mb-4">
                <p className="text-gray-700 mb-2 font-medium">描述</p>
                <div className="line-clamp-2 text-gray-600 text-sm">
                  {product.description || '暂无描述'}
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setSelectedProduct(product);
                    setShowDetailModal(true);
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center text-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  详情
                </button>
                <button
                  onClick={() => openRelationsModal(product)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center text-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                  管理关系
                </button>
                <button
                  onClick={() => openEditModal(product)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center text-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  编辑
                </button>
                <button
                  onClick={() => handleDeleteClick(product.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center text-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  删除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-indigo-600">产品信息管理</h1>

              <div className="relative w-full max-w-xl mx-8 flex-1 min-w-[200px]">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="输入SKU或Model搜索产品..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    aria-label="搜索产品"
                    disabled={loading && !searching} 
                  />
                  <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>


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
            {searching && <p className="text-xs text-gray-500 mt-1">正在搜索...</p>}
          </div>
          <button
            onClick={toggleModal}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
            disabled={loading}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            添加产品
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {searchTerm && !loading && (
          <div className="mb-6 text-sm text-gray-600">
            搜索 "<span className="font-medium">{searchTerm}</span>" 的结果 ({products.length} 个)
          </div>
        )}
        {renderProductList()}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          message="确定要删除该产品吗？此操作不可恢复。"
          confirmText="确认删除"
          cancelText="取消"
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteDialog(false)}
          isDanger={true}
        />
      </main>

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

      {/* 新增/编辑产品模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-20 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingProduct ? '编辑产品' : '添加新产品'}
                </h2>
                <button
                  onClick={toggleModal}
                  className="text-gray-400 hover:text-gray-600"
                  type="button"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SKU <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="sku"
                      value={newProduct.sku}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        formErrors.sku ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="请输入产品SKU"
                    />
                    {formErrors.sku && <p className="text-red-500 text-sm mt-1">{formErrors.sku}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="model"
                      value={newProduct.model}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        formErrors.model ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="请输入产品Model"
                    />
                    {formErrors.model && <p className="text-red-500 text-sm mt-1">{formErrors.model}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand(specially for) <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="brand"
                      value={newProduct.brand}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        formErrors.brand ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      {BRAND_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    {formErrors.brand && <p className="text-red-500 text-sm mt-1">{formErrors.brand}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      产品类型 <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="productType"
                      value={newProduct.productType}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        formErrors.productType ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      {PRODUCT_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    {formErrors.productType && <p className="text-red-500 text-sm mt-1">{formErrors.productType}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      产品链接
                    </label>
                    <input
                      type="url"
                      name="httpLink"
                      value={newProduct.httpLink}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        formErrors.httpLink ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="https://example.com/product"
                    />
                    {formErrors.httpLink ? (
                      <p className="text-red-500 text-sm mt-1">{formErrors.httpLink}</p>
                    ) : (
                      <p className="text-gray-500 text-sm mt-1">请输入完整的URL地址（可选）</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
                  <textarea
                    name="description"
                    value={newProduct.description}
                    onChange={handleInputChange}
                    rows="3"
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.description ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="请输入产品详细描述..."
                  />
                  {formErrors.description && <p className="text-red-500 text-sm mt-1">{formErrors.description}</p>}
                </div>
                <div className="flex flex-col md:flex-row gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">产品图片</label>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <label className="cursor-pointer px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                          <span>选择</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                            id="image-upload"
                          />
                        </label>
                        <p className="text-sm text-gray-500">JPG, PNG, GIF, WebP 格式, 最大5MB</p>
                      </div>
                      {preview && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-700 mb-2">图片预览:</p>
                          <div className="relative w-48 h-48 border border-gray-300 rounded-lg overflow-hidden">
                            <img
                              src={preview}
                              alt="产品图片预览"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/300x200?text=图片错误';
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setPreview('');
                                setImageFile(null);
                                setNewProduct(prev => ({ ...prev, image: null, _hasImage: false }));
                              }}
                              className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">PDF 说明书</label>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <label className="cursor-pointer px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                          <span>选择 PDF 文件</span>
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={handlePdfChange}
                            className="hidden"
                            id="pdf-upload"
                          />
                        </label>
                        <p className="text-sm text-gray-500">PDF格式，最大5MB</p>
                      </div>
                      {pdfFile && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            已选择文件: <span className="font-medium">{pdfFile.name}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            大小: {(pdfFile.size / 1024).toFixed(2)} KB
                          </p>
                          <button
                            type="button"
                            onClick={() => setPdfFile(null)}
                            className="ml-2 text-red-500 hover:text-red-700"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                      {!pdfFile && newProduct.manual && (
                        <div className="mt-4 flex items-start">
                          <div className="flex-1">
                            <p className="text-sm text-gray-700 mb-2">当前已有说明书:</p>
                            <a
                              href={newProduct.manual.startsWith('http') ? newProduct.manual : `${BASE_URL}${newProduct.manual.startsWith('/') ? newProduct.manual : '/' + newProduct.manual}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm break-all"
                            >
                              {newProduct.manual}
                            </a>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setPdfFile(null);
                              setNewProduct(prev => ({ ...prev, manual: null, _hasManual: false }));
                            }}
                            className="ml-2 text-red-500 hover:text-red-700"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={toggleModal}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {isSubmitting ? '提交中...' : editingProduct ? '更新产品' : '添加产品'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 产品关系管理模态框 */}
      {showRelationsModal && selectedProductForRelations && (
        <ProductRelationsManager
          product={selectedProductForRelations}
          onClose={closeRelationsModal}
          onSave={() => {
            fetchProducts();
          }}
          apiUrl="/api/products"
        />
      )}

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

      {/* 产品详情模态框 */}
      {showDetailModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">产品详情</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">型号 (Model)</label>
                <p className="mt-1 p-2 bg-gray-50 rounded">{selectedProduct.model}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">SKU</label>
                <p className="mt-1 p-2 bg-gray-50 rounded">{selectedProduct.sku}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">品牌</label>
                <p className="mt-1 p-2 bg-gray-50 rounded">{selectedProduct.brand || '—'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">产品类型</label>
                <p className="mt-1 p-2 bg-gray-50 rounded">{selectedProduct.productType || '—'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">状态</label>
                <p className="mt-1 p-2 bg-gray-50 rounded">
                  {selectedProduct.status === 'active' ? '在售' :
                   selectedProduct.status === 'discontinued' ? '停产' : '开发中'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">描述</label>
                <p className="mt-1 p-2 bg-gray-50 rounded whitespace-pre-wrap">
                  {selectedProduct.description || '—'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">产品链接</label>
                {selectedProduct.httpLink ? (
                  <a
                    href={selectedProduct.httpLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {selectedProduct.httpLink}
                  </a>
                ) : (
                  <p className="mt-1 p-2 bg-gray-50 rounded">—</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">产品图片</label>
                {selectedProduct.image ? (
                  <img
                    src={getProductImageUrl(selectedProduct)}
                    alt="产品图片"
                    className="mt-2 max-w-full h-auto max-h-64 object-contain border border-gray-300 rounded"
                    onError={handleImageError}
                  />
                ) : (
                  <p className="mt-2 text-gray-500">无图片</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">说明书</label>
                {selectedProduct.manual ? (
                  <a
                    href={getProductImageUrl({ image: selectedProduct.manual })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline mt-2 inline-block"
                  >
                    查看 PDF 说明书
                  </a>
                ) : (
                  <p className="mt-2 text-gray-500">无说明书</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
