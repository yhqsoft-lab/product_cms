// src/pages/ProductManagement.jsx
import React, { useEffect, useState} from 'react';
//import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/useUser';
import ConfirmDialog from '../components/ConfirmDialog'; // 根据你的项目结构调整路径

export default function ProductManagement() {

  /*
  const { user, loading: isUserLoading } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isUserLoading) return;

    if (!user) {
      navigate('/login', { replace: true });
    }

    else if (!['admin', 'editor'].includes(user.role)) {
      navigate('/unauthorized', { replace: true });
    }

  }, [user, isUserLoading , navigate]);

*/


  // 页面内容...


    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null); // 编辑目标
    //添加状态控制弹窗显示
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
      //const BASE_URL = 'http://localhost:5000'; // 后端地址



    // 新产品表单字段
    const [newProduct, setNewProduct] = useState({

      productType:'',
      description: '',
      brand:'',
      model:'',
      httpLink: ''


    });

  //  const [brand, setBrand] = useState(''); // 下拉框绑定的状态

    // 图片状态
    const [image, setImage] = useState(null);


    // 图片预览
    const [preview, setPreview] = useState('');

    // 错误信息
    const [formErrors, setFormErrors] = useState({});

    // API 地址（根据你的后端部署地址修改）
    const API_URL = '/api/products';

    // 品牌选项（可从 API 获取）
    const brandOptions = [
      { value: '', label: '请选择品牌' },
      { value: 'Hunter', label: 'Hunter' },
      { value: 'Harbor Breeze', label: 'Harbor Breeze' },
      { value: 'Hampton Bay', label: 'Hampton Bay' },
      { value: 'CoreBay', label: 'CoreBay' },
      { value: 'Others', label: '其他' }
    ];

    // 产品类型选项（可从 API 获取）
    const productTypeOptions = [
      { value: '', label: '请选择产品类型' },
      { value: 'Ceiling Fan', label: 'Ceiling Fan' },
      { value: 'Control Kit', label: 'Control Kit' },
      { value: 'Remote', label: 'Remote' },
      { value: 'Receiver', label: 'Receiver' },
      { value: 'Others', label: '其他' }
    ];




    // 获取产品数据

    const fetchProducts = async (search = '') => {
    console.log('📡 获取产品数据:', search ? `搜索: ${search}` : '全部数据');
    setLoading(true);
    setError(null);

    try {
      const url = search
        ? `${API_URL}?search=${encodeURIComponent(search)}`
        : API_URL;

      const res = await fetch(url);

      if (!res.ok) throw new Error('网络响应异常');

      const data = await res.json();
      console.log('✅ 产品数据:', data);
      setProducts(data);
    } catch (err) {
      console.error('❌ 获取产品失败:', err);
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };


    // 防抖搜索
    useEffect(() => {
      if (searchTerm.trim() === '') {
        fetchProducts(); // 搜索为空时获取全部产品
        return;
      }

      const timer = setTimeout(() => {
        fetchProducts(searchTerm);
      }, 500);

      return () => clearTimeout(timer); // 清除上一个定时器
    }, [searchTerm]);




    // 输入框变化（更新 searchTerm）

    const handleSearchChange = (e) => {
      const value = e.target.value;
      setSearchTerm(value);

      if (value.trim() === '') {
        console.log('搜索词已清空');
        fetchProducts(); // 可选：自动刷新数据
      }
    };

    // 图片选择变化
   const handleImageChange = (e) => {
     const file = e.target.files[0];
     if (file) {
       setImage(file);
       const reader = new FileReader();
      // reader.onload = (e) => setPreview(e.target.result);
       reader.onload = (e) => {
        setPreview(e.target.result);
        setNewProduct(prev => ({ ...prev, image: e.target.result })); // ✅ 同步更新 newProduct.image
      };
       reader.readAsDataURL(file);
     }
   };


  /*
    // 打开/关闭模态框
    const toggleModal = () => {
      setShowModal(!showModal);
      setFormErrors({});
      setNewProduct({
        httpLink: '',
        description: '',
        image: 'https://picsum.photos/300/200?random=' + Math.random()
      });
    };
  */
    // 打开/关闭模态框

    const toggleModal = () => {
      setShowModal(!showModal);
      setEditingProduct(null);
      setFormErrors({});
      setNewProduct({   productType:'', description: '', brand:'', model:'', httpLink: ''});
      //setBrand('');
      setPreview('');
      setImage(null);
    };



    // 表单输入变化
    const handleInputChange = (e) => {
      const { name, value } = e.target;
      setNewProduct(prev => ({ ...prev, [name]: value }));
    };

    // 验证表单
    const validateForm = () => {
      const errors = {};
      if (!newProduct.httpLink.trim()) errors.httpLink = '产品名称不能为空';
      if (!newProduct.description.trim()) errors.description = '描述不能为空';
      if (!newProduct.brand) errors.brand = 'please secelet Brand';
      if (!newProduct.productType) errors.productType = 'please secelet Type';
      if (!newProduct.model) errors.model = 'please secelet Type';

      setFormErrors(errors);
      return Object.keys(errors).length === 0;
    };

  /*
    // 提交新商品
    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!validateForm()) return;

      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProduct)
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP 错误: ${res.status} - ${errText}`);
        }

        const addedProduct = await res.json();
        setProducts(prev => [addedProduct, ...prev]);
        toggleModal();
        alert('产品添加成功');
      } catch (err) {
        console.error('添加失败:', err);
        setError(err.message);
      }
    };
  */

      // 提交新商品或修改已有产品
      const handleSubmit = async (e) => {
       e.preventDefault();
        if (!validateForm()) return;

        const formData = new FormData();
        formData.append('httpLink', newProduct.httpLink);
        formData.append('description', newProduct.description);
        formData.append('brand', newProduct.brand); // 注意字段名与后端模型匹配
        formData.append('productType', newProduct.productType);
        formData.append('model', newProduct.model);
      if (image)  formData.append('image', image);



        try {
          const method = editingProduct ? 'PUT' : 'POST';
          const url = editingProduct ? `${API_URL}/${newProduct.id}` : API_URL;

          const res = await fetch(url, {
            method,
    //      headers: { 'Content-Type': 'application/json' },
    //       body: JSON.stringify(newProduct)
           body: formData
                         });

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`HTTP 错误: ${res.status} - ${errText}`);
          }

          const data = await res.json();

          if (editingProduct) {
            // 替换原有产品
            setProducts(prev => prev.map(f => f.id === data.id ? data : f));
            alert('产品已更新');
          } else {
            // 添加新产品到最前面
            setProducts(prev => [data, ...prev]);
            alert('产品已添加');
          }

          toggleModal();
        } catch (err) {
          console.error('操作失败:', err);
          setError(err.message);
        }
      };
  /*
      // 删除产品
      const handleDeleteProduct = async (id) => {
        if (!window.confirm('确定要删除该产品吗？')) return;

        try {
          const res = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
          });

          if (!res.ok) throw new Error('删除失败，请重试');

          setProducts(prev => prev.filter(f => f.id !== id));
          alert('产品已删除');
        } catch (err) {
          setError(err.message);
        }
      };

  */

      // 打开编辑模态框
       const openEditModal = (product) => {

         setEditingProduct(product);
         setNewProduct({ ...product }); // 拷贝当前产品信息到表单 确保 product 对象中包含 image 字段
         setPreview(product.image || ''); // 初始化 preview
         //setBrand(product.brand || ''); // 同步 brand 状态
         setShowModal(true);
       };



    /*   // 删除产品
         const handleDelete = async (deleteId) => {
           try {
             const res = await fetch(`${API_URL}/${deleteId}`, {
               method: 'DELETE'
             });

             if (!res.ok) throw new Error('删除失败，请重试');

             setProducts(prev => prev.filter(f => f.id !== deleteId));
              //alert(deleteId));
             alert('产品已成功删除');
           } catch (err) {
             setError(err.message);
             alert('删除失败');
           }
           setShowDeleteDialog(false);
         };
      */
         // 删除确认后的处理
  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(`${API_URL}/${deleteId}`, { method: 'DELETE' });


      if (!res.ok) throw new Error('删除失败');

      // 更新本地状态
      setProducts(prev => prev.filter(f => f.id !== deleteId));
      alert('删除成功');

    } catch (err) {
      alert('删除失败111: ' + err.message);
    } finally {
      setShowDeleteDialog(false);
      setDeleteId(null);
    }
  };

         // 删除按钮点击
         const handleDeleteClick = (id) => {
           setDeleteId(id);
           setShowDeleteDialog(true);
            alert(id);

         };



    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-indigo-600">Product信息</h1>

            <div className="relative w-full max-w-xl ml-8 mr-8">
              <input
                type="text"
                placeholder="输入Product ID搜索产品..."
                value={searchTerm}
            //    onChange={(e) => setSearchTerm(e.target.value)}
                onChange={handleSearchChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={toggleModal}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Add ProductID
            </button>
          </div>
        </header>





              {/* Main Content */}
              <main className="container mx-auto px-4 py-8">
                {loading ? (
                  <div className="flex justify-center items-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
                    <span className="ml-3 text-gray-600">加载中...</span>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-16 text-red-500">
                    <p>数据加载失败：{error}</p>
                    <button
                      onClick={() => fetchProducts()}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      重试
                    </button>
                  </div>
                ) : products.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

                    {products.map((product) => (

                      <div
                        key={product.id}

                        className="flex flex-row  items-center bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1"
                      >
                        <img

                //       src={.image || 'https://via.placeholder.com/300x200'}

                       src={`${product.image}`}
                          //   src={preview}
                          //alt={`暂无图片`}
                            alt={product.model}
                          className="w-40 h-40 sm:w-48 sm:h-48 md:w-60 md:h-60 object-cover"
                        />


                         <div className="grid grid-rows-3 p-6 gap-4 leading-6 w-1/2 sm:w-full md:w-1/2 min-w-0 overflow-hidden">
                          <h2 className="text-xl font-semibold mb-2 text-gray-800">{`Model:${product.model}`}</h2>


                          <p className="text-gray-600 mb-1"> {`${product.brand || ''} ${product.productType ||  ''} ${product.id}`}</p>




                      {/*    <p className="text-gray-600 mb-4 whitespace-normal sm:line-clamp-3 line-clamp-2">
                               Feture：{Product.description || '暂无描述'}
                             </p>

                        */}
                        <p className="text-gray-600 mb-1 whitespace-normal overflow-hidden line-clamp-2">
      <span className="font-medium text-gray-700">描述：</span>
      {product.description || '暂无描述'}
    </p>


                          <div className="flex space-x-2">
                        {/*    <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                              Detail
                            </button>
                         */}
                            <button
                              onClick={() => openEditModal(product)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleDeleteClick(product.id)}
                              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            >
                              Delete
                            </button>




                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16">
                    <svg className="w-16 h-16 text-gray-400 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <h2 className="text-xl font-medium text-gray-700 mb-2">未找到相关产品</h2>
                    <p className="text-gray-500 text-center max-w-md">
                      请尝试使用其他关键词进行搜索，或清除输入框查看所有产品
                    </p>
                    <button
                      onClick={() => setSearchTerm('')}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      返回首页
                    </button>
                  </div>
                )}

                {/* 插入删除确认弹窗 */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          message="确定要删除该产品吗？此操作不可恢复。"
          confirmText="删除"
          cancelText="取消"
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteDialog(false)}
        />
              </main>



        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-6 mt-12">
          <div className="container mx-auto px-4 text-center text-gray-600">
            <p>© 2025 产品中心 | 所有产品信息来源于数据库</p>
          </div>
        </footer>

        {/* 新增产品模态框 */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">

              <h2 className="text-xl font-bold mb-4">添加Product信息</h2>
              <form onSubmit={handleSubmit}>

              <div className="mb-4 flex flex-col md:flex-row md:items-center gap-2">

              {/* Model */}
                <label className="text-gray-700 whitespace-nowrap">
                 Model:
                </label>

               <input
              type="text"
              name="model"
              value={newProduct.model}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
               />
                {formErrors.model && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.model}</p>
                )}

    {/* 品牌下拉框 */}

              <label className="text-gray-700 whitespace-nowrap">品牌:</label>

             <select
               value={newProduct.brand}
               onChange={(e) => setNewProduct(prev => ({
                                    ...prev,
                            brand: e.target.value // 直接更新 newProduct.brand
                        }))}

               className="w-full px-3 py-2 border rounded"
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

  {/*
              <div className="mb-4">
                  <label className="block text-gray-700 mb-1">Product ID</label>
                  <input
                    type="text"
                    httpLink="httpLink"
                    value={newProduct.httpLink}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {formErrors.httpLink && <p className="text-red-500 text-sm mt-1">{formErrors.httpLink}</p>}
                </div>
   */}

                {/* 品牌下拉框 */}


    {/*
                    <div className="mb-4">
                       <label className="block text-gray-700 mb-2">品牌（Brand）</label>
                       <select
                         value={newProduct.brand}
                         onChange={(e) => setNewProduct(prev => ({
                                              ...prev,
                                      brand: e.target.value // 直接更新 newProduct.brand
                                  }))}

                         className="w-full px-3 py-2 border rounded"
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
  */}
  {/* 产品类型下拉框 */}
  <div className="mb-4 flex flex-col md:flex-row md:items-center gap-2">
      <label className="text-gray-700 whitespace-nowrap">类别:</label>

     <select
       value={newProduct.productType}
       onChange={(e) => setNewProduct(prev => ({
                            ...prev,
                    productType: e.target.value // 直接更新 newProduct.productType
                }))}

       className="w-full px-3 py-2 border rounded"
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



                  <div className="mb-4 flex flex-col md:flex-row md:items-center gap-2">
                      <label className="text-gray-700 whitespace-nowrap">描述:</label>
                  <textarea
                    name="description"
                    value={newProduct.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  ></textarea>
                  {formErrors.description && <p className="text-red-500 text-sm mt-1">{formErrors.description}</p>}
                </div>


          <div className="mb-4 flex flex-col md:flex-row md:items-center gap-2">
                <label className="text-gray-700 whitespace-nowrap">
                 Product Link:
                </label>

                <input
                type="text"
                name="httpLink"
                value={newProduct.httpLink}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {formErrors.httpLink && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.httpLink}</p>
                )}

          </div>



        {/* 图片上传 */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">产品图片:</label>


          <input
            type="file"
            name="image"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none"
          />
    {/*        {newProduct.image && (
            <img
              //src={newProduct.image}
              src={`http://localhost:5000${newProduct.image}`}
              alt="已有图片"
              className="mt-3 w-full h-auto rounded border border-gray-300"
            />
          )}  */}


          {/* 预览逻辑：优先显示新上传的预览，否则显示已有图片 */}
           {preview || newProduct.image ? (

        <img
          src={preview || newProduct.image.startsWith('http') ? newProduct.image : `${newProduct.image}`}
          alt={preview ? "新上传预览图" : "现有产品图片"} // ✅ 正确的 alt 描述
          // className="mt-3 w-full h-auto rounded border border-gray-300"
          className="mt-3 w-full max-w-xs max-h-48 object-contain rounded border border-gray-300"
          onError={() => {
            setPreview(''); // 清除无效预览
            if (!preview) alert('图片加载失败，请检查路径');
          }}
        />


                ) : (
             <div className="mt-3 p-8 bg-gray-100 rounded border border-gray-300 text-center text-gray-500">
                  未选择图片
            </div>
            )}


        </div>





                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={toggleModal}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    提交
                  </button>
                </div>
              </form>
            </div>
              </div>
        )}


      </div>
    );
  }
