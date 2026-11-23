// src/pages/FccManagement.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/useUser';
import ConfirmDialog from '../components/ConfirmDialog';
import AddProductToFccForm from '../components/AddProductToFccForm';
import FccProductList from '../components/FccProductList';

// ✅ 统一的图片路径处理工具函数
export const formatImageUrl = (img, baseUrl = '') => {
  if (!img || img === 'null' || img === 'undefined') return null;
  if (img.startsWith('http') || img.startsWith('data:')) return img;
  return `${baseUrl}${img.startsWith('/') ? img : '/' + img}`;
};

// ✅ 图片组件：固定尺寸 + 本地占位图回退
const ImageWithFallback = ({ src, alt, className, randomId = 'default' }) => {
  const [error, setError] = useState(false);
  const placeholderImage = '/images/placeholder-product.png';
  const isEmpty = !src || src === 'null' || src === 'undefined' || src.endsWith('null') || src.endsWith('undefined');
  const effectiveSrc = (isEmpty || error) ? placeholderImage : src;

  return (
    <img
      src={effectiveSrc}
      alt={alt || 'product'}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
      width="400"
      height="400"
    />
  );
};

export default function FccManagement() {
  const { user, loading: isUserLoading } = useUser();
  const navigate = useNavigate();
  const token = user?.token;

  // ✅ FCC 管理状态
  const [fccs, setFccs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingFcc, setEditingFcc] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🚀 新增：记录下拉框是否处于“自定义输入”模式
  const [customFields, setCustomFields] = useState({
    brand: false,
    productType: false,
    speed: false
  });

  // ✅ 产品管理状态
  const [selectedFcc, setSelectedFcc] = useState(null);
  const [products, setProducts] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [productManagementLoading, setProductManagementLoading] = useState(false);
  const [productManagementError, setProductManagementError] = useState('');
  const [showProductManagement, setShowProductManagement] = useState(false);

  // ✅ 删除对话框状态
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteTargetName, setDeleteTargetName] = useState('');

  // API 配置（仅当配置了完整 http(s) 地址时使用，否则使用同源相对路径）
  const rawApiBase = process.env.REACT_APP_API_BASE || '';
  const BASE_URL = /^https?:\/\//i.test(rawApiBase) ? rawApiBase.replace(/\/+$/, '') : '';
  const API_URL = `${BASE_URL}/api/fccs`;
  const PRODUCT_API_URL = `${BASE_URL}/api/products`;
  const IMAGE_BASE_URL = BASE_URL;

  // 新产品表单字段
  const [newFcc, setNewFcc] = useState({
    name: '',
    brand: '',
    productType: '',
    speed: '',
    description: ''
  });

  // 图片状态
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // 选项数据
  const BRAND_OPTIONS = [
    { value: '', label: '请选择品牌' },
    { value: 'Hunter', label: 'Hunter' },
    { value: 'Harbor Breeze', label: 'Harbor Breeze' },
    { value: 'Hampton Bay', label: 'Hampton Bay' },
    { value: 'CoreBay', label: 'CoreBay' },
    { value: 'Others', label: '其他 (Other)' }
  ];

  const PRODUCT_TYPE_OPTIONS = [
    { value: '', label: '请选择产品类型' },
    { value: 'Ceiling Fan', label: 'Ceiling Fan' },
    { value: 'Control Kit', label: 'Control Kit' },
    { value: 'Remote', label: 'Remote' },
    { value: 'Receiver', label: 'Receiver' },
    { value: 'Others', label: '其他 (Other)' }
  ];

  const SPEED_OPTIONS = [
    { value: '', label: '请选择AC/DC类型' },
    { value: 'AC 3-speeds', label: 'AC 3-speeds' },
    { value: 'AC 3-speeds with Reverse', label: 'AC 3-speeds with Reverse' },
    { value: 'AC 4-speeds', label: 'AC 4-speeds' },
    { value: 'AC 4-speeds with Reverse', label: 'AC 4-speeds with Reverse' },
    { value: 'DC 6-speeds', label: 'DC 6-speeds' },
    { value: 'DC 6-speeds with Reverse', label: 'DC 6-speeds with Reverse' },
    { value: 'Others', label: '其他 (Other)' }
  ];

  const getAuthHeaders = () => {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const fetchFccs = useCallback(async (search = '') => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    try {
      const url = search ? `${API_URL}?search=${encodeURIComponent(search)}` : API_URL;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!isMounted) return;

      if (!res.ok) {
        if (res.status === 401) throw new Error('认证失效，请重新登录');
        if (res.status === 403) throw new Error('权限不足，无法访问');
        throw new Error(`请求失败: ${res.status}`);
      }

      const data = await res.json();
      if (!isMounted) return;
      setFccs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('获取FCC列表失败:', err);
      setError(err.message);
      setFccs([]);
      if (err.message.includes('认证') || err.message.includes('401')) {
        navigate('/login', { replace: true });
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [token, navigate]);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user && !token) {
      navigate('/login', { replace: true });
      return;
    }
  }, [user, token, isUserLoading, navigate]);

  useEffect(() => {
    fetchFccs();
  }, [fetchFccs]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      fetchFccs();
      return;
    }
    const timer = setTimeout(() => {
      fetchFccs(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, fetchFccs]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const fetchAvailableProducts = async () => {
    try {
      const res = await fetch(PRODUCT_API_URL, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('获取产品列表失败');
      const data = await res.json();
      setAvailableProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('获取可选产品失败:', err);
      setProductManagementError('获取可选产品失败');
    }
  };

  const fetchProducts = async () => {
    if (!selectedFcc) return;
    setProductManagementLoading(true);
    setProductManagementError('');
    try {
      const res = await fetch(`${API_URL}/${selectedFcc.id}/products`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('获取关联产品失败');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('获取关联产品失败:', err);
      setProductManagementError(err.message);
    } finally {
      setProductManagementLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableProducts();
  }, []);

  useEffect(() => {
    if (showProductManagement && selectedFcc) {
      fetchProducts();
    }
  }, [showProductManagement, selectedFcc]);

  const filteredAvailableProducts = useMemo(() => {
    const associatedIds = new Set(products.map(p => p.id));
    return availableProducts.filter(p => !associatedIds.has(p.id));
  }, [availableProducts, products]);

  const handleAddSuccess = () => {
    fetchProducts();
  };

  const handleRemoveProduct = async (productId) => {
    try {
      const res = await fetch(`${API_URL}/${selectedFcc.id}/products/${productId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || '删除失败');
      }
      setProducts(prev => prev.filter(p => p.id !== productId));
      showToast('产品已删除', 'success');
    } catch (err) {
      console.error('删除产品失败:', err);
      showToast('删除失败: ' + err.message, 'error');
    }
  };

  const openProductManagement = (fcc) => {
    setSelectedFcc(fcc);
    setShowProductManagement(true);
    setProducts([]);
    setProductManagementError('');
  };

  const closeProductManagement = () => {
    setSelectedFcc(null);
    setShowProductManagement(false);
    setProducts([]);
    setProductManagementError('');
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.type || '';
    const fileName = file.name || '';

    const isImageMime = fileType.startsWith('image/');
    const isImageExt = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);

    if (!isImageMime && !isImageExt) {
      showToast('请上传 JPG、PNG、GIF 或 WebP 格式的图片', 'error');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('图片不能超过 5MB', 'error');
      e.target.value = '';
      return;
    }

    setImageFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPreview(event.target.result);
      }
    };
    reader.onerror = () => {
      showToast('图片读取失败', 'error');
      setImageFile(null);
      setPreview('');
    };
    reader.readAsDataURL(file);
  };

  const toggleModal = () => {
    setShowModal(!showModal);
    setEditingFcc(null);
    setFormErrors({});
    setNewFcc({ name: '', brand: '', productType: '', speed: '', description: '' });
    setPreview('');
    setImageFile(null);
    // 🚀 弹窗关闭时重置为下拉框模式
    setCustomFields({ brand: false, productType: false, speed: false });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewFcc(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // 🚀 处理下拉框的选择，选了 Others 就开启自定义输入
  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    if (value === 'Others') {
      setCustomFields(prev => ({ ...prev, [name]: true }));
      setNewFcc(prev => ({ ...prev, [name]: '' })); // 切换时清空旧值
    } else {
      setCustomFields(prev => ({ ...prev, [name]: false }));
      setNewFcc(prev => ({ ...prev, [name]: value }));
    }
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // 🚀 退出自定义模式，切回下拉框
  const cancelCustomField = (fieldName) => {
    setCustomFields(prev => ({ ...prev, [fieldName]: false }));
    setNewFcc(prev => ({ ...prev, [fieldName]: '' }));
    if (formErrors[fieldName]) {
      setFormErrors(prev => ({ ...prev, [fieldName]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!newFcc.name?.trim()) {
      errors.name = 'FCC ID 不能为空';
    } else if (newFcc.name.trim().length < 3) {
      errors.name = 'FCC ID 至少3个字符';
    }

    if (!newFcc.brand?.trim()) errors.brand = '请选择或输入品牌';
    if (!newFcc.productType?.trim()) errors.productType = '请选择或输入产品类型';
    if (!newFcc.speed?.trim()) errors.speed = '请选择或输入AC/DC类型';

    if (newFcc.description && newFcc.description.length > 500) {
      errors.description = '描述不能超过500个字符';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (isSubmitting) return;

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('name', newFcc.name.trim());
    formData.append('description', newFcc.description?.trim() || '');
    // 提交时统一 trim 掉前后空格
    formData.append('brand', newFcc.brand.trim());
    formData.append('productType', newFcc.productType.trim());
    formData.append('speed', newFcc.speed.trim());

    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      const method = editingFcc ? 'PUT' : 'POST';
      const url = editingFcc ? `${API_URL}/${editingFcc.id}` : API_URL;

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `HTTP 错误: ${res.status}`);
      }

      const data = await res.json();

      if (editingFcc) {
        setFccs(prev => prev.map(f => f.id === data.id ? { ...f, ...data } : f));
        showToast('FCC信息已更新', 'success');
      } else {
        setFccs(prev => [data, ...prev]);
        showToast('FCC信息已添加', 'success');
      }

      toggleModal();
      fetchFccs();
    } catch (err) {
      console.error('操作失败:', err);
      showToast('操作失败: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (fcc) => {
    setEditingFcc(fcc);
    setNewFcc({
      name: fcc.name || '',
      brand: fcc.brand || '',
      productType: fcc.productType || '',
      speed: fcc.speed || '',
      description: fcc.description || ''
    });

    // 🚀 智能识别逻辑：如果已有数据不在预设列表中，自动展示文本输入框
    setCustomFields({
      brand: fcc.brand ? !BRAND_OPTIONS.some(opt => opt.value === fcc.brand) : false,
      productType: fcc.productType ? !PRODUCT_TYPE_OPTIONS.some(opt => opt.value === fcc.productType) : false,
      speed: fcc.speed ? !SPEED_OPTIONS.some(opt => opt.value === fcc.speed) : false
    });

    if (fcc.image) {
      const imageUrl = formatImageUrl(fcc.image, IMAGE_BASE_URL);
      setPreview(imageUrl || '');
    } else {
      setPreview('');
    }

    setShowModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(`${API_URL}/${deleteId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || '删除失败');
      }

      setFccs(prev => prev.filter(f => f.id !== deleteId));
      showToast(`"${deleteTargetName}" 已删除`, 'success');
    } catch (err) {
      console.error('删除失败:', err);
      showToast('删除失败: ' + err.message, 'error');
    } finally {
      setShowDeleteDialog(false);
      setDeleteId(null);
      setDeleteTargetName('');
    }
  };

  const handleDeleteClick = (fcc) => {
    setDeleteId(fcc.id);
    setDeleteTargetName(fcc.name || fcc.id);
    setShowDeleteDialog(true);
  };

  const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 text-white transition-all duration-300 ${
      type === 'success' ? 'bg-green-600' :
      type === 'error' ? 'bg-red-600' : 'bg-gray-700'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  const renderFccList = () => {
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
          <p className="text-center max-w-md">数据加载失败：{error}</p>
          <button
            onClick={() => fetchFccs(searchTerm)}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            重试
          </button>
        </div>
      );
    }

    if (fccs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h2 className="text-xl font-medium text-gray-800 mb-2">未找到 FCC 信息</h2>
          <p className="text-gray-500 text-center max-w-md">请尝试使用其他关键词进行搜索，或添加新的FCC记录</p>
        </div>
      );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {fccs.map((fcc) => {
            return (
              <div key={fcc.id}
               className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300">


                {/* 上半部分：图片在左，信息在右 */}
                <div className="flex flex-row flex-1">

                  {/* 1. 图片在左 (占宽 50%) */}
                  <div className="w-1/2 aspect-square relative bg-gray-50 flex-shrink-0 border-r border-gray-100">
                    <ImageWithFallback
                      src={formatImageUrl(fcc.image, IMAGE_BASE_URL)}
                      alt={fcc.name || 'product'}
                      className="w-full h-full object-cover"
                      randomId={fcc.id}
                    />
                    {/* FCC ID 悬浮标签
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded shadow-sm"> */}
                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                      FCC ID: {fcc.name || '无'}
                    </div>
                  </div>

                  {/* 2. 信息在右 (占宽 50%) */}
                  <div className="w-1/2 p-4 flex flex-col">


                    {/* Brand 和 产品类型 放一行 */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[11px] rounded-md font-medium truncate max-w-full">
                        {fcc.brand || '无品牌'}
                      </span>
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[11px] rounded-md font-medium truncate max-w-full">
                        {fcc.productType || '无类型'}
                      </span>
                    </div>

                    {/* 产品描述，截断成两行 */}
                    <div className="flex-1 mt-1">
                      <h4 className="text-xs font-bold text-gray-700 mb-1">描述</h4>
                      <div
                        className="text-xs text-gray-500 line-clamp-2 leading-relaxed"
                        title={fcc.description}
                      >
                        {fcc.description || '暂无描述'}
                      </div>
                    </div>

                  </div>
                </div>

                {/* 下半部分：操作按钮区域 */}
                <div className="border-t border-gray-100 p-3 bg-gray-50/50 mt-auto">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => openEditModal(fcc)}
                      className="py-1.5 border border-green-200 bg-white rounded-lg text-green-600 flex items-center justify-center text-xs font-medium hover:bg-green-50 transition-colors"
                      title="编辑"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      编辑
                    </button>
                    <button
                      onClick={() => openProductManagement(fcc)}
                      className="py-1.5 border border-indigo-200 bg-white rounded-lg text-indigo-600 flex items-center justify-center text-xs font-medium hover:bg-indigo-50 transition-colors"
                      title="管理产品"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      产品
                    </button>
                    <button
                      onClick={() => handleDeleteClick(fcc)}
                      className="py-1.5 border border-red-200 bg-white rounded-lg text-red-600 flex items-center justify-center text-xs font-medium hover:bg-red-50 transition-colors"
                      title="删除"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      删除
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      );
  };

  const renderProductManagement = () => {
    if (!showProductManagement || !selectedFcc) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800">
              管理产品 - FCC: {selectedFcc.name || selectedFcc.id}
            </h2>
            <button
              onClick={closeProductManagement}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              aria-label="关闭"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              <AddProductToFccForm
                fccId={selectedFcc.id}
                onAdd={handleAddSuccess}
                availableProducts={availableProducts}
                filteredAvailableProducts={filteredAvailableProducts}
              />
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 col-span-1 lg:col-span-2 shadow-sm">
              <FccProductList
                products={products}
                loading={productManagementLoading}
                error={productManagementError}
                onRemove={handleRemoveProduct}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-indigo-600">FCC信息管理</h1>



        <div className="relative w-full max-w-xl mx-8 flex-1 min-w-[200px]">
          <div className="relative">
            <input
              type="text"
              placeholder="输入FCC ID搜索..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
              aria-label="搜索FCC"
              disabled={loading} // ✅ 同步 Products 逻辑，加载时禁用
            />
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="清除搜索"
                disabled={loading} // ✅ 同步 Products 逻辑
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <button
          onClick={toggleModal}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading} // ✅ 同步 Products 逻辑
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          添加 FCC
        </button>
      </div>
    </header>

      <main className="container mx-auto px-4 py-8 flex-1">
        {renderFccList()}
      </main>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        message={`确定要删除 "${deleteTargetName}" 吗？此操作不可恢复。`}
        confirmText="确认删除"
        cancelText="取消"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteDialog(false);
          setDeleteId(null);
          setDeleteTargetName('');
        }}
      />

      {renderProductManagement()}

      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
          <p>© {new Date().getFullYear()} FCC ID | 数据来源于网络收集</p>
        </div>
      </footer>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b px-6 py-4 z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingFcc ? '编辑FCC' : '添加新FCC'}
                </h2>
                <button
                  onClick={toggleModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                  type="button"
                  aria-label="关闭"
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

                  {/* 1. FCC ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      FCC ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={newFcc.name}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                        formErrors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="例如: 2AOKB-XYZ123"
                      maxLength={50}
                    />
                    {formErrors.name && (
                      <p className="text-red-500 text-sm mt-1" role="alert">{formErrors.name}</p>
                    )}
                  </div>

                  {/* 2. Brand (支持自定义) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand <span className="text-red-500">*</span>
                    </label>
                    {!customFields.brand ? (
                      <select
                        name="brand"
                        value={newFcc.brand}
                        onChange={handleSelectChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                          formErrors.brand ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        {BRAND_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          name="brand"
                          value={newFcc.brand}
                          onChange={handleInputChange}
                          autoFocus
                          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                            formErrors.brand ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="请输入自定义 Brand"
                        />
                        <button
                          type="button"
                          onClick={() => cancelCustomField('brand')}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          title="取消自定义"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                    {formErrors.brand && (
                      <p className="text-red-500 text-sm mt-1" role="alert">{formErrors.brand}</p>
                    )}
                  </div>

                  {/* 3. 产品类型 (支持自定义) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      产品类型 <span className="text-red-500">*</span>
                    </label>
                    {!customFields.productType ? (
                      <select
                        name="productType"
                        value={newFcc.productType}
                        onChange={handleSelectChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                          formErrors.productType ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        {PRODUCT_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          name="productType"
                          value={newFcc.productType}
                          onChange={handleInputChange}
                          autoFocus
                          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                            formErrors.productType ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="请输入自定义产品类型"
                        />
                        <button
                          type="button"
                          onClick={() => cancelCustomField('productType')}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          title="取消自定义"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                    {formErrors.productType && (
                      <p className="text-red-500 text-sm mt-1" role="alert">{formErrors.productType}</p>
                    )}
                  </div>

                  {/* 4. AC/DC 类型 (支持自定义) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AC/DC 类型 <span className="text-red-500">*</span>
                    </label>
                    {!customFields.speed ? (
                      <select
                        name="speed"
                        value={newFcc.speed}
                        onChange={handleSelectChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                          formErrors.speed ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        {SPEED_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          name="speed"
                          value={newFcc.speed}
                          onChange={handleInputChange}
                          autoFocus
                          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                            formErrors.speed ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="请输入自定义 AC/DC 类型"
                        />
                        <button
                          type="button"
                          onClick={() => cancelCustomField('speed')}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          title="取消自定义"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                    {formErrors.speed && (
                      <p className="text-red-500 text-sm mt-1" role="alert">{formErrors.speed}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    产品描述
                  </label>
                  <textarea
                    name="description"
                    value={newFcc.description}
                    onChange={handleInputChange}
                    rows="3"
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                      formErrors.description ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="请输入产品详细描述（可选，最多500字）..."
                    maxLength={500}
                  />
                  {formErrors.description && (
                    <p className="text-red-500 text-sm mt-1" role="alert">{formErrors.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1 text-right">{newFcc.description?.length || 0}/500</p>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      产品图片
                    </label>
                    <div className="space-y-4">
                      <div className="flex items-center flex-wrap gap-3">
                        <label className="cursor-pointer px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors inline-flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>选择图片</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handleImageChange}
                            className="hidden"
                            id="image-upload"
                          />
                        </label>
                        <p className="text-sm text-gray-500">
                          支持 JPG, PNG, GIF, WebP • 最大 5MB
                        </p>
                      </div>

                      {preview && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-700 mb-2">预览:</p>
                          <div className="relative w-48 h-48 border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                            <img
                              src={preview}
                              alt="预览"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = '/images/placeholder-product.png';
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setPreview('');
                                setImageFile(null);
                                const fileInput = document.getElementById('image-upload');
                                if (fileInput) fileInput.value = '';
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                              aria-label="移除图片"
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
                </div>

              </div>

              <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={toggleModal}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isSubmitting}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      处理中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      {editingFcc ? '更新' : '添加'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
