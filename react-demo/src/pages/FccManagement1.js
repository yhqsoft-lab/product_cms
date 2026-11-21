import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/useUser';
import ConfirmDialog from '../components/ConfirmDialog';
import AddProductToFccForm from '../components/AddProductToFccForm';

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
  const [products, setProducts] = useState([]); // 已关联产品
  const [availableProducts, setAvailableProducts] = useState([]); // 所有产品
  const [productManagementLoading, setProductManagementLoading] = useState(false);
  const [productManagementError, setProductManagementError] = useState('');
  const [showProductManagement, setShowProductManagement] = useState(false);

  // ✅ 删除对话框状态
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // ✅ API 地址
  const API_URL = 'http://localhost:5000/api/fccs';
  const PRODUCT_API_URL = 'http://localhost:5000/api/products';

  // ✅ 表单状态
  const [newFcc, setNewFcc] = useState({
    name: '',
    brand: '',
    productType: '',
    speed: '',
    description: ''
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // ✅ 选项配置
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

  // ✅ 获取 FCC 列表
  const fetchFccs = async (search = '') => {
    setLoading(true);
    setError(null);
    try {
      const url = search
        ? `${API_URL}?search=${encodeURIComponent(search)}`
        : API_URL;
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
  };

  // ✅ 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFccs(searchTerm.trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ✅ 初始加载
  useEffect(() => {
    fetchFccs();
  }, []);

  // ✅ 获取所有可选产品（只加载一次）
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
      const res = await fetch(`${API_URL}/${selectedFcc.name}/products`);
      if (!res.ok) throw new Error('获取关联产品失败');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      setProductManagementError(err.message);
    } finally {
      setProductManagementLoading(false);
    }
  };

  // ✅ 加载可用产品（只一次）
  useEffect(() => {
    fetchAvailableProducts();
  }, []);

  // ✅ 打开产品管理时加载关联产品
  useEffect(() => {
    if (showProductManagement && selectedFcc) {
      fetchProducts();
    }
  }, [showProductManagement, selectedFcc]);

  // ✅ 计算过滤后的可选产品（排除已关联的）
  const filteredAvailableProducts = useMemo(() => {
    const associatedIds = new Set(products.map(p => p.id));
    return availableProducts.filter(p => !associatedIds.has(p.id));
  }, [availableProducts, products]);

  // ✅ 添加成功后刷新
  const handleAddSuccess = () => {
    fetchProducts();
  };

  // ✅ 删除产品关联
  const handleRemoveProduct = async (productId) => {
    try {
      const res = await fetch(`${API_URL}/${selectedFcc.name}/products/${productId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('删除失败');
      setProducts(prev => prev.filter(p => p.id !== productId));
      alert('产品已删除');
    } catch (err) {
      alert('删除失败: ' + err.message);
    }
  };

  // ✅ 打开产品管理界面
  const openProductManagement = (fcc) => {
    setSelectedFcc(fcc);
    setShowProductManagement(true);
    setProducts([]);
    setProductManagementError('');
  };

  // ✅ 关闭产品管理界面
  const closeProductManagement = () => {
    setSelectedFcc(null);
    setShowProductManagement(false);
    setProducts([]);
    setProductManagementError('');
  };

  // ✅ 图片上传
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
        setNewFcc(prev => ({ ...prev, image: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // ✅ 打开/关闭模态框
  const toggleModal = () => {
    setShowModal(!showModal);
    setEditingFcc(null);
    setFormErrors({});
    setNewFcc({ name: '', brand: '', productType: '', speed: '', description: '' });
    setPreview('');
    setImage(null);
  };

  // ✅ 表单输入变化
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewFcc(prev => ({ ...prev, [name]: value }));
  };

  // ✅ 验证表单
  const validateForm = () => {
    const errors = {};
    if (!newFcc.name.trim()) errors.name = 'FCC ID 不能为空';
    if (!newFcc.description.trim()) errors.description = '描述不能为空';
    if (!newFcc.brand) errors.brand = '请选择品牌';
    if (!newFcc.productType) errors.productType = '请选择产品类型';
    if (!newFcc.speed) errors.speed = '请选择AC/DC类型';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ✅ 提交表单
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
      const url = editingFcc ? `${API_URL}/${editingFcc.id}` : API_URL;

      const res = await fetch(url, { method, body: formData });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP 错误: ${res.status}`);
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

  // ✅ 打开编辑
  const openEditModal = (fcc) => {
    setEditingFcc(fcc);
    setNewFcc({ ...fcc });
    setPreview(fcc.image || '');
    setShowModal(true);
  };

  // ✅ 删除 FCC
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

  // ✅ 渲染 FCC 列表
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
            onClick={fetchFccs}
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
          <p className="text-gray-500 text-center max-w-md">
            请尝试使用其他关键词进行搜索
          </p>
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
              src={fcc.image ? `http://localhost:5000${fcc.image}` : 'https://picsum.photos/300/200?random=123'}
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
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDeleteClick(fcc.id)}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                >
                  删除
                </button>
                <button
                  onClick={() => openProductManagement(fcc)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
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

  // ✅ 渲染产品管理弹窗（上下布局）
  const renderProductManagement = () => {
    if (!showProductManagement || !selectedFcc) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold">FCC ID: {selectedFcc.name}</h2>
            <button
              onClick={closeProductManagement}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="p-6 space-y-8">
            {/* 添加表单 */}
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">添加关联产品</h3>
              <AddProductToFccForm
                fccId={selectedFcc.name}
                onAdd={handleAddSuccess}
                availableProducts={availableProducts}
                filteredAvailableProducts={filteredAvailableProducts}
              />
            </div>

            {/* 已关联产品列表 */}
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">
                已关联产品 ({products.length})
              </h3>
              {productManagementLoading ? (
                <div className="text-center py-4">加载中...</div>
              ) : productManagementError ? (
                <div className="text-red-500">{productManagementError}</div>
              ) : products.length === 0 ? (
                <div className="text-center py-4 text-gray-500">暂无关联产品</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">产品型号</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">品牌</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">描述</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {products.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm font-medium">{product.model}</td>
                          <td className="px-4 py-2 text-sm">{product.brand}</td>
                          <td className="px-4 py-2 text-sm max-w-xs line-clamp-1">
                            {product.description || '-'}
                          </td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => handleRemoveProduct(product.id)}
                              className="px-3 py-1 text-xs text-red-600 bg-red-100 rounded hover:bg-red-200"
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-indigo-600">FCC信息管理</h1>
          <div className="relative w-full max-w-xl">
            <input
              type="text"
              placeholder="输入FCC ID搜索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-gray-400"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={toggleModal}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            添加 FCC
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {renderFccList()}
      </main>

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        message="确定要删除该 FCC 吗？此操作不可恢复。"
        confirmText="删除"
        cancelText="取消"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />

      {/* 产品管理弹窗 */}
      {renderProductManagement()}

      {/* 添加/编辑 FCC 模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingFcc ? '编辑 FCC 信息' : '添加 FCC 信息'}
            </h2>
            <form onSubmit={handleSubmit}>
              {/* FCC ID */}
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">FCC ID</label>
                <input
                  type="text"
                  name="name"
                  value={newFcc.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded"
                />
                {formErrors.name && <p className="text-red-500 text-sm">{formErrors.name}</p>}
              </div>

              {/* 品牌 */}
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">品牌</label>
                <select
                  name="brand"
                  value={newFcc.brand}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded"
                >
                  {brandOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {formErrors.brand && <p className="text-red-500 text-sm">{formErrors.brand}</p>}
              </div>

              {/* 产品类型 */}
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">类别</label>
                <select
                  name="productType"
                  value={newFcc.productType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded"
                >
                  {productTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {formErrors.productType && <p className="text-red-500 text-sm">{formErrors.productType}</p>}
              </div>

              {/* AC/DC 类型 */}
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">AC/DC 类型</label>
                <select
                  name="speed"
                  value={newFcc.speed}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded"
                >
                  {speedOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {formErrors.speed && <p className="text-red-500 text-sm">{formErrors.speed}</p>}
              </div>

              {/* 描述 */}
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">描述</label>
                <textarea
                  name="description"
                  value={newFcc.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-3 py-2 border rounded"
                />
                {formErrors.description && <p className="text-red-500 text-sm">{formErrors.description}</p>}
              </div>

              {/* 图片上传 */}
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">产品图片</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-3 py-2 border rounded"
                />
                {(preview || newFcc.image) && (
                  <img
                    src={preview || (newFcc.image.startsWith('http') ? newFcc.image : `http://localhost:5000${newFcc.image}`)}
                    alt="预览"
                    className="mt-2 w-32 h-32 object-cover rounded border"
                  />
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={toggleModal}
                  className="px-4 py-2 bg-gray-300 rounded"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded"
                >
                  提交
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t py-4 mt-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© 2025 FCC 产品管理系统</p>
        </div>
      </footer>
    </div>
  );
}
