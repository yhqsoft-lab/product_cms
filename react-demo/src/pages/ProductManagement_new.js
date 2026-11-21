// src/pages/ProductManagement.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useUser } from '../context/useUser'; // 添加这行
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';
import ProductRelationsManager from '../components/ProductRelationsManager';

export default function ProductManagement() {
  // 添加用户认证检查
   const { user, loading: isUserLoading } = useUser();
   const navigate = useNavigate();

   useEffect(() => {
     if (isUserLoading) return;
     if (!user) {
       navigate('/login', { replace: true });
     }
   }, [user, isUserLoading, navigate]);




  // 页面状态
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]); // ✅ 新增：用于 relations 下拉选项
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [searching, setSearching] = useState(false);
 //Relations
  const [showRelationsModal, setShowRelationsModal] = useState(false);
  const [selectedProductForRelations, setSelectedProductForRelations] = useState(null);

  // 文件状态
  const [imageFile, setImageFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [preview, setPreview] = useState('');
//防止重复提交
 const [isSubmitting, setIsSubmitting] = useState(false);

  // 表单状态
  const [newProduct, setNewProduct] = useState({
    productType: '',
    description: '',
    brand: '',
    model: '',
    httpLink: '',
    manual: ''
  });

  // 错误信息
  const [formErrors, setFormErrors] = useState({});

  // API 地址
//  const API_URL = '/api/products';
  const BASE_URL = 'http://localhost:5000'; // 添加 Base URL
  const API_PRODUCTS = `${BASE_URL}/api/products`; // ✅ 统一入口

  // 品牌选项
  const brandOptions = [
    { value: '', label: '请选择品牌' },
    { value: 'Hunter', label: 'Hunter' },
    { value: 'Harbor Breeze', label: 'Harbor Breeze' },
    { value: 'Hampton Bay', label: 'Hampton Bay' },
    { value: 'CoreBay', label: 'CoreBay' },
    { value: 'Others', label: '其他' }
  ];

  // 产品类型选项
  const productTypeOptions = [
    { value: '', label: '请选择产品类型' },
    { value: 'Ceiling Fan', label: 'Ceiling Fan' },
    { value: 'Control Kit', label: 'Control Kit' },
    { value: 'Remote', label: 'Remote' },
    { value: 'Receiver', label: 'Receiver' },
    { value: 'Others', label: '其他' }
  ];

  // 获取所有产品（用于 relations选择）
  const fetchAllProducts = useCallback(async () => {
    try {
      const res = await fetch(API_PRODUCTS);
      if (!res.ok) throw new Error('获取产品列表失败');
      const data = await res.json();
      setAllProducts(data);
    } catch (err) {
      console.error('获取所有产品失败:', err);
    }
  }, []);

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
  }, []);

  // 初始化加载
  useEffect(() => {
    fetchProducts();
    fetchAllProducts(); // ✅ 加载所有产品用于下拉框
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

  // 图片选择处理
  const handleImageChange = (e) => {
    const file = e.target.files[0];
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

  // PDF 选择处理
  const handlePdfChange = (e) => {
    const file = e.target.files[0];
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
//添加打开/关闭关系管理的方法添加打开/关闭关系管理的方法
  const openRelationsModal = (product) => {
    setSelectedProductForRelations(product);
    setShowRelationsModal(true);
   };

  const closeRelationsModal = () => {
    setShowRelationsModal(false);
    setSelectedProductForRelations(null);
   };

  // 打开/关闭模态框
  const toggleModal = () => {
    setShowModal(!showModal);
    setEditingProduct(null);
    setFormErrors({});
    setNewProduct({
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

  // 表单输入变化
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };


  // URL 验证
  const isValidUrl = (url) => {
    if (!url?.trim()) return true;
    try {
      new URL(url);
      return true;
    } catch (_) {
      return false;
    }
  };

  // 表单验证
  const validateForm = () => {
    const errors = {};
    if (!newProduct.model?.trim()) errors.model = '型号不能为空';
    if (!newProduct.brand) errors.brand = '请选择品牌';
    if (!newProduct.productType) errors.productType = '请选择产品类型';
    if (!newProduct.description?.trim()) errors.description = '描述不能为空';
    if (newProduct.httpLink && !isValidUrl(newProduct.httpLink)) {
      errors.httpLink = '请输入有效的URL链接';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 提交表单
  const handleSubmit = async (e) => {

    e.preventDefault();
    if (!validateForm()) return;
    if (isSubmitting) return;
    setIsSubmitting(true);


    // 判断用户是否选择了新文件（关键！）
    const hasNewFiles = imageFile || pdfFile;
    const isEditing = !!editingProduct;
    const url = isEditing
      ? `${API_PRODUCTS}/${newProduct.id}`
      : '${API_PRODUCTS}';

    // 获取 token
    const token = user?.token;
    if (!token) {
      alert('身份验证已过期，请重新登录');
      navigate('/login');
      return;
    }

    console.log('=== 开始提交表单 ===');
    console.log('1. 编辑模式:', isEditing);
    console.log('2. 是否包含新文件:', hasNewFiles);
    console.log('3. 表单数据:', newProduct);

    try {
      let response;

      if (hasNewFiles) {
        // 📤 使用 multipart/form-data（仅当有新文件时）
        const formData = new FormData();
        formData.append('model', newProduct.model);
        formData.append('description', newProduct.description);
        formData.append('brand', newProduct.brand);
        formData.append('productType', newProduct.productType);
        if (newProduct.httpLink?.trim()) {
          formData.append('httpLink', newProduct.httpLink.trim());
        }
        if (imageFile) {
          console.log('🖼️ 附加新图片:', imageFile.name, imageFile.type, `${(imageFile.size / 1024).toFixed(2)} KB`);
          formData.append('image', imageFile);
        }
        if (pdfFile) {
          console.log('📄 附加新PDF:', pdfFile.name, pdfFile.type, `${(pdfFile.size / 1024).toFixed(2)} KB`);
          formData.append('manual', pdfFile);
        }

        console.log('📤 发送 multipart/form-data 请求到:', url);
        response = await fetch(url, {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Authorization': `Bearer ${token}`, // ✅ 必须携带
          },
          body: formData,
        });
      } else {
        // 📤 使用 application/json（无新文件时）
        const jsonData = {
          model: newProduct.model,
          description: newProduct.description,
          brand: newProduct.brand,
          productType: newProduct.productType,
        };
        if (newProduct.httpLink?.trim()) {
          jsonData.httpLink = newProduct.httpLink.trim();
        }
        // ⚠️ 不发送 image/manual 字段 → 后端保留原值

        console.log('📤 发送 JSON 请求到:', url);
        console.log('📝 JSON 数据:', jsonData);
        response = await fetch(url, {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`, // ✅ 必须携带
          },
          body: JSON.stringify(jsonData),
        });
      }

      console.log('✅ 服务器响应状态:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 服务器返回错误内容:', errorText);
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
      console.log('📥 服务器返回数据:', data);

      // 更新 UI
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
    }
    finally {
    setIsSubmitting(false);
    }
  };

  // 打开编辑模态框（修复版）
  const openEditModal = async (product) => {
    setEditingProduct(product);


    setNewProduct({
      ...product

      });

    // 设置图片预览
    if (product.image) {
      const imageUrl = product.image.startsWith('http') || product.image.startsWith('data:')
        ? product.image
        : `${BASE_URL}${product.image.startsWith('/') ? product.image : '/' + product.image}`;
      setPreview(imageUrl);
    }

    setShowModal(true);
  };


  const confirmDelete = async () => {
    if (!deleteId) return;

    // ✅ 从 context 获取 token
    const token = user?.token;

    if (!token) {
      alert('请先登录');
      return;
    }

    try {
      const res = await fetch(`${API_PRODUCTS}/${deleteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}` // ✅ 正确格式
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

  // 删除按钮点击
  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setShowDeleteDialog(true);
  };

  // 获取产品图片 URL
  const getProductImageUrl = (product) => {
    // 如果 image 为 null、undefined 或空，直接返回一个简单的 base64 图片
    if (!product.image || product.image === 'null' || product.image === 'undefined') {
      // 一个简单的黑色文字"No Image"的白色背景图片
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSIxNTAiIHk9IjEwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2Ij5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
    }

    // 如果已经是完整URL或base64数据
    if (product.image.startsWith('http') || product.image.startsWith('data:')) {
      return product.image;
    }

    // 处理相对路径
    return `${BASE_URL}${product.image.startsWith('/') ? product.image : '/' + product.image}`;
  };

  // 处理图片加载错误
  // 处理图片加载错误
  const handleImageError = (e) => {
    // 使用 base64 编码的图片，确保始终可用
    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmNWY1ZjUiLz48dGV4dCB4PSIxNTAiIHk9IjEwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5Ij5JbWFnZSBFcnJvcjwvdGV4dD48L3N2Zz4=';
    e.target.onerror = null; // 防止无限循环
  };
  // 获取关联产品名称
  const getRelatedProductNames = (relationsIds) => {
    if (!relationsIds || relationsIds.length === 0) return [];
    return relationsIds
      .map(id => allProducts.find(p => p.id === id))
      .filter(p => p)
      .map(p => p.model);
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
              ? `没有找到包含"${searchTerm}"的产品，请尝试其他关键词。`
              : '当前还没有任何产品，点击"添加产品"按钮开始添加'
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
      {products.map((product) => {
     const relatedProductNames = getRelatedProductNames(product.relationsIds || []);

    return (
      <div
        key={product.id}
        className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300"
      >
        {/* 上半部分：左右布局 */}
        <div className="flex flex-col md:flex-row">
          {/* 左侧：图片，占1/2宽度 */}
          <div className="w-full md:w-1/2 relative">
            <div className="h-64 md:h-full bg-gray-100 overflow-hidden">
              <img
                src={getProductImageUrl(product)}
                alt={product.model || '产品图片'}
                className="w-full h-full object-cover"
                onError={handleImageError}
                loading="lazy"
              />
              {/* 图片上的Model和SKU信息 */}
              <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
       {product.sku || '未知SKU'}
     </div>
     <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
       {product.productType || '未知TYPE'}
     </div>
            </div>
          </div>

          {/* 右侧：基本信息，占1/2宽度 */}
          <div className="w-full md:w-1/2 p-4 md:p-6">
            {/* 第一行：ID */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500 font-medium">产品ID</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded font-mono">
                  #{product.id}
                </span>
              </div>

              {/* 类型和品牌 */}
              <div className="flex space-x-2 mb-4">
                <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full">
                  {product.productType || '未知类型'}
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                  {product.brand || '未知品牌'}
                </span>
              </div>
            </div>

            {/* 链接部分 */}
            <div className="space-y-3">
              {/* 产品链接 */}
              {product.httpLink && (
                <div>
            {/*      <span className="text-sm text-gray-700 font-medium block mb-1">产品链接</span>  */}
                  <a
                    href={product.httpLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm truncate block inline-flex items-center"
                    title={product.httpLink}
                  >
                  {/*     {product.httpLink.length > 40
                      ? `${product.httpLink.substring(0, 40)}...`
                      : product.httpLink}  */}
                      <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      产品链接
                  </a>
                </div>
              )}

              {/* Manual 链接 */}
              {product.manual && (
                <div>
                {/*    <span className="text-sm text-gray-700 font-medium block mb-1">说明书</span>  */}
                  <a
                    href={product.manual.startsWith('http') ? product.manual : `${BASE_URL}${product.manual.startsWith('/') ? product.manual : '/' + product.manual}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm truncate block inline-flex items-center"
                  /*  title={product.manual} */
                  >
                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    查看说明书
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 下部分：描述、兼容产品和操作按钮 */}
        <div className="border-t border-gray-200 p-4 md:p-6">
          {/* 描述 - 固定两行 */}
          <div className="mb-4">
            <p className="text-gray-700 mb-2 font-medium">描述</p>
            <div className="line-clamp-2 text-gray-600 text-sm">
              {product.description || '暂无描述'}
            </div>
          </div>

          {/* 兼容产品 */}
          {relatedProductNames.length > 0 && (
            <div className="mb-4">
              <p className="text-gray-700 mb-2 font-medium">兼容产品</p>
              <div className="flex flex-wrap gap-2">
                {relatedProductNames.map((name, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => {/* 这里可以添加详情查看功能 */}}
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
    );
  })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-indigo-600">产品信息管理</h1>

          <div className="relative w-full max-w-xl mx-8">
            <div className="relative">
              <input
                type="text"
                placeholder="输入型号或描述搜索产品..."
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
              <p className="text-xs text-gray-500 mt-1">正在搜索...</p>
            )}
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* 搜索统计信息 */}
        {searchTerm && !loading && (
          <div className="mb-6 text-sm text-gray-600">
            搜索 "<span className="font-medium">{searchTerm}</span>" 的结果 ({products.length} 个)
          </div>
        )}

        {renderProductList()}

        {/* 删除确认弹窗 */}
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
                {/* 基本信息 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 型号 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      型号 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="model"
                      value={newProduct.model}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        formErrors.model ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="请输入产品型号"
                    />
                    {formErrors.model && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.model}</p>
                    )}
                  </div>

                  {/* 品牌 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      品牌 <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="brand"
                      value={newProduct.brand}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        formErrors.brand ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      {brandOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {formErrors.brand && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.brand}</p>
                    )}
                  </div>

                  {/* 产品类型 */}
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
                      {productTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {formErrors.productType && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.productType}</p>
                    )}
                  </div>

                  {/* 产品链接 */}
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

                {/* 描述 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    描述 <span className="text-red-500">*</span>
                  </label>
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
                  {formErrors.description && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.description}</p>
                  )}
                </div>

                {/* ✅ 关键：relations 多选下拉框
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    兼容产品 (Work With)
                  </label>
                  <select
                    multiple
                    value={newProduct.relationsIds}
                    onChange={handlerelationsChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg h-32"
                  >
                    {allProducts
                      .filter(p => !editingProduct || p.id !== editingProduct.id) // 排除自身
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.model} (ID: {p.id})
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    按住 Ctrl (Windows) 或 Cmd (Mac) 可多选
                  </p>
                </div>
*/}
                {/* 图片上传 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    产品图片
                  </label>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <label className="cursor-pointer px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                        <span>选择图片</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                          id="image-upload"
                        />
                      </label>
                      <p className="text-sm text-gray-500">
                        支持 JPG, PNG, GIF 格式，最大 5MB
                      </p>
                    </div>

                    {/* 图片预览 */}
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

                {/* PDF 上传 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PDF 说明书
                  </label>
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
                      <p className="text-sm text-gray-500">
                        仅支持 PDF 格式，最大 5MB
                      </p>
                    </div>

                    {/* PDF 文件信息 */}
                    {pdfFile && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                          已选择文件: <span className="font-medium">{pdfFile.name}</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          大小: {(pdfFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    )}

                    {/* 现有 PDF 链接 */}
                    {!pdfFile && newProduct.manual && (
                      <div className="mt-4">
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
                    )}
                  </div>
                </div>
              </div>

              {/* 表单操作 */}
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
      // 可选：刷新产品列表以同步最新关系
      fetchProducts();
    }}
    apiUrl="/api/products"
  />
)}
    </div>
  );
}
