// src/pages/FccManagement.jsx



import React, { useState, useEffect, useMemo, useCallback } from 'react';
//import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/useUser';
import ConfirmDialog from '../components/ConfirmDialog'; // 根据你的项目结构调整路径
import AddProductToFccForm from '../components/AddProductToFccForm';
import FccProductList from '../components/FccProductList';



export default function FccManagement() {
  const { user, loading: isUserLoading } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, isUserLoading, navigate]);

  // ✅ FCC 管理状态
  const [fccs, setFccs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingFcc, setEditingFcc] = useState(null);

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

  // ✅ API 地址
  const API_URL = '/api/fccs';
  const PRODUCT_API_URL = '/api/products';

  // 新产品表单字段
  const [newFcc, setNewFcc] = useState({
    name: '',
    brand: '',
    productType: '',
    speed: '',
    description: ''
  });

  // 图片状态
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // 选项数据
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

  const speedOptions = [
    { value: '', label: '请选择AC/DC类型' },
    { value: 'AC 3-speeds', label: 'AC 3-speeds' },
    { value: 'AC 3-speeds with Reverse', label: 'AC 3-speeds with Reverse' },
    { value: 'AC 4-speeds', label: 'AC 4-speeds' },
    { value: 'AC 4-speeds with Reverse', label: 'AC 4-speeds with Reverse' },
    { value: 'DC 6-speeds', label: 'DC 6-speeds' },
    { value: 'DC 6-speeds with Reverse', label: 'DC 6-speeds with Reverse' },
    { value: 'Others', label: 'other' }
  ];

  // ✅ 修正 3: 使用 useCallback 包装 fetchFccs，避免不必要的重新渲染
  const fetchFccs = useCallback(async (search = '') => {
    setLoading(true);
    setError(null);
    try {
      const url = search ? `${API_URL}?search=${encodeURIComponent(search)}` : API_URL;
      const res = await fetch(url);
      if (!res.ok) throw new Error('网络响应异常');
      const data = await res.json();
      setFccs(data);
    } catch (err) {
      setError(err.message);
      setFccs([]);
    } finally {
      setLoading(false);
    }
  }, []); // API_URL 视为外部常量

  // 页面加载时获取初始数据
  useEffect(() => {
    fetchFccs();
  }, [fetchFccs]);

  // 防抖搜索
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

  // ✅ 获取所有可选产品
  const fetchAvailableProducts = async () => {
    try {
      const res = await fetch(PRODUCT_API_URL);
      if (!res.ok) throw new Error('获取产品列表失败');
      const data = await res.json();
      setAvailableProducts(data);
    } catch (err) {
      setProductManagementError('获取可选产品失败');
    }
  };

  // ✅ 获取已关联产品
  const fetchProducts = async () => {
    if (!selectedFcc) return;
    setProductManagementLoading(true);
    setProductManagementError('');
    try {
      const res = await fetch(`${API_URL}/${selectedFcc.id}/products`);
      if (!res.ok) throw new Error('获取关联产品失败');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
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
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('删除失败');
      setProducts(prev => prev.filter(p => p.id !== productId));
      alert('产品已删除');
    } catch (err) {
      alert('删除失败: ' + err.message);
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
    const file = e.target.files; // 修正为取第一个文件
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (event) => {
       setPreview(event.target.result);
       setNewFcc(prev => ({ ...prev, image: event.target.result }));
     };
      reader.readAsDataURL(file);
    }
  };

  const toggleModal = () => {
    setShowModal(!showModal);
    setEditingFcc(null);
    setFormErrors({});
    setNewFcc({ name: '', brand: '', productType: '', speed: '', description: '' });
    setPreview('');
    setImage(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewFcc(prev => ({ ...prev, [name]: value }));
  };

  // ✅ 修正 2: 增加可选链(?.trim())防空报错，修正提示文案
  const validateForm = () => {
    const errors = {};
    if (!newFcc.name?.trim()) errors.name = 'FCC ID 不能为空';
    if (!newFcc.description?.trim()) errors.description = '描述不能为空';
    if (!newFcc.brand) errors.brand = 'Please select Brand';
    if (!newFcc.productType) errors.productType = 'Please select Type';
    if (!newFcc.speed) errors.speed = 'Please select Speed';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const formData = new FormData();
    formData.append('name', newFcc.name);
    formData.append('description', newFcc.description);
    formData.append('brand', newFcc.brand);
    formData.append('productType', newFcc.productType);
    formData.append('speed', newFcc.speed);
    if (image) formData.append('image', image);

    try {
      const method = editingFcc ? 'PUT' : 'POST';
      const url = editingFcc ? `${API_URL}/${newFcc.id}` : API_URL;

      const res = await fetch(url, {
        method,
        body: formData
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP 错误: ${res.status} - ${errText}`);
      }

      const data = await res.json();

      if (editingFcc) {
        setFccs(prev => prev.map(f => f.id === data.id ? data : f));
        alert('FCC信息已更新');
      } else {
        setFccs(prev => [data, ...prev]);
        alert('FCC信息已添加');
      }

      toggleModal();
    } catch (err) {
      console.error('操作失败:', err);
      setError(err.message);
    }
  };

  const openEditModal = (fcc) => {
    setEditingFcc(fcc);
    setNewFcc({ ...fcc });
    setPreview(fcc.image || '');
    setShowModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(`${API_URL}/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      setFccs(prev => prev.filter(f => f.id !== deleteId));
      alert('删除成功');
    } catch (err) {
      alert('删除失败: ' + err.message);
    } finally {
      setShowDeleteDialog(false);
      setDeleteId(null);
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setShowDeleteDialog(true);
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
          <p>数据加载失败：{error}</p>
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
          <p className="text-gray-500 text-center max-w-md">请尝试使用其他关键词进行搜索</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {fccs.map((fcc) => (
          <div
            key={fcc.id}
            className="flex flex-row items-center bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300"
          >
            <img
              src={fcc.image ? `${fcc.image}` : 'https://picsum.photos/300/200?random=123'}
              alt={fcc.name}
              className="w-40 h-40 object-cover"
            />
            <div className="p-6 w-1/2 min-w-0">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">FCC ID: {fcc.name}</h2>
              <p className="text-gray-600 mb-1">{fcc.brand || ''} {fcc.productType || ''}</p>
              <p className="text-gray-600 mb-4 line-clamp-2">
                <span className="font-medium">描述:</span> {fcc.description || '暂无描述'}
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => openEditModal(fcc)}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDeleteClick(fcc.id)}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                >
                  删除
                </button>
                <button
                  onClick={() => openProductManagement(fcc)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  管理产品
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderProductManagement = () => {
    if (!showProductManagement || !selectedFcc) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">FCC ID: {selectedFcc.name || selectedFcc.id}</h2>
            <button
              onClick={closeProductManagement}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <AddProductToFccForm
                fccId={selectedFcc.id}
                onAdd={handleAddSuccess}
                availableProducts={availableProducts}
                filteredAvailableProducts={filteredAvailableProducts}
              />
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 col-span-1 lg:col-span-2">
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
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-indigo-600">FCC信息</h1>

          <div className="relative flex-1 max-w-xl mx-auto md:mx-8">
            <input
              type="text"
              placeholder="输入FCC ID搜索产品..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          <button
            onClick={toggleModal}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            Add FCCID
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1">
        {renderFccList()}
      </main>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        message="确定要删除该产品吗？此操作不可恢复。"
        confirmText="删除"
        cancelText="取消"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />

      {renderProductManagement()}

      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© {new Date().getFullYear()} 产品中心 | 所有产品信息来源于数据库</p>
        </div>
      </footer>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z- p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-gray-800">{editingFcc ? '编辑 FCC 信息' : '添加 FCC 信息'}</h2>
              <button onClick={toggleModal} className="text-gray-400 hover:text-gray-600 focus:outline-none">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">FCC ID:</label>
                    <input
                      type="text"
                      name="name"
                      value={newFcc.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {formErrors.name && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">品牌:</label>
                    <select
                      value={newFcc.brand}
                      onChange={(e) => setNewFcc(prev => ({ ...prev, brand: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      {brandOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {formErrors.brand && <p className="text-red-500 text-sm mt-1">{formErrors.brand}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">类别:</label>
                    <select
                      value={newFcc.productType}
                      onChange={(e) => setNewFcc(prev => ({ ...prev, productType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      {productTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {formErrors.productType && <p className="text-red-500 text-sm mt-1">{formErrors.productType}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">AC/DC:</label>
                    <select
                      value={newFcc.speed}
                      onChange={(e) => setNewFcc(prev => ({ ...prev, speed: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      {speedOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {formErrors.speed && <p className="text-red-500 text-sm mt-1">{formErrors.speed}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">描述:</label>
                  <textarea
                    name="description"
                    value={newFcc.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  ></textarea>
                  {formErrors.description && <p className="text-red-500 text-sm mt-1">{formErrors.description}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">产品图片:</label>
                  <input
                    key={editingFcc ? editingFcc.id : 'new-fcc-image-upload'}
                    type="file"
                    name="image"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
                  />

                  {preview || newFcc.image ? (
                    <div className="mt-4 flex justify-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <img
                        src={preview || newFcc.image.startsWith('http') ? newFcc.image : `${newFcc.image}`}
                        alt={preview ? "新上传预览图" : "现有产品图片"}
                        className="w-full max-w-xs max-h-48 object-contain rounded"
                        onError={() => {
                          setPreview('');
                          if (!preview) alert('图片加载失败，请检查路径');
                        }}
                      />
                    </div>
                  ) : (
                    <div className="mt-4 p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center text-gray-500">
                      未选择图片
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={toggleModal}
                    className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
                  >
                    提交
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
