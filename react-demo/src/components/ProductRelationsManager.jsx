// src/components/ProductRelationsManager.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Filter, X, CheckCircle, RefreshCw, Package, Image as ImageIcon } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

const ProductRelationsManager = ({
  product,
  onClose,
  onSave,
  apiUrl = '/api/products'
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [relations, setRelations] = useState([]); // 批量编辑的临时状态
  const [activeRelationType, setActiveRelationType] = useState('all');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedRelationType, setSelectedRelationType] = useState('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 关系类型配置
  const relationTypes = [
    {
      id: 'compatible',
      name: '可匹配产品',
      color: 'bg-green-100 text-green-800 border-green-300',
      icon: CheckCircle
    },
    {
      id: 'upgrade',
      name: '升级款产品',
      color: 'bg-blue-100 text-blue-800 border-blue-300', // ✅ 不同颜色
      icon: RefreshCw // ✅ 不同图标
    },
    {
      id: 'replacement',
      name: '可替代产品',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      icon: RefreshCw
    }
  ];

  // 解析后端返回的关系数据，并确保去重
  const parseRelationsData = (rawData) => {
    let compatibleData = [];
    let upgradeData = [];
    let replacementData = [];

    if (rawData.success && rawData.data) {
      compatibleData = Array.isArray(rawData.data.compatible) ? rawData.data.compatible : [];
      upgradeData = Array.isArray(rawData.data.upgrade) ? rawData.data.upgrade : [];
      replacementData = Array.isArray(rawData.data.replacement) ? rawData.data.replacement : [];
    } else {
      compatibleData = Array.isArray(rawData.compatible) ? rawData.compatible : [];
      upgradeData = Array.isArray(rawData.upgrade) ? rawData.upgrade : [];
      replacementData = Array.isArray(rawData.replacement) ? rawData.replacement : [];
    }

    // ✅ 关键修复：确保同一个产品不会同时出现在两种关系中
    const processedIds = new Set();
    const result = [];

    // 优先处理兼容产品
    compatibleData.forEach(p => {
      if (!processedIds.has(p.id)) {
        processedIds.add(p.id);
        result.push({
          targetProduct: p,
          relationType: 'compatible'
        });
      }
    });
    // 优先处理兼容产品
    upgradeData.forEach(p => {
      if (!processedIds.has(p.id)) {
        processedIds.add(p.id);
        result.push({
          targetProduct: p,
          relationType: 'upgrade'
        });
      }
    });

    // 处理替代产品，如果已存在（作为兼容），则跳过
    replacementData.forEach(p => {
      if (!processedIds.has(p.id)) {
        processedIds.add(p.id);
        result.push({
          targetProduct: p,
          relationType: 'replacement'
        });
      }
    });

    return result;
  };

  // 获取产品图片URL
  const getProductImageUrl = (product) => {
    // 根据你的产品数据结构调整
    if (product.imageUrl) return product.imageUrl;
    if (product.images && product.images.length > 0) return product.images[0];
    if (product.image && typeof product.image === 'string') return product.image;
    return null;
  };

  // 获取初始数据
  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      // 获取所有产品（排除当前产品）
      const productsRes = await apiClient(`${apiUrl}`);
      const allProducts = await productsRes.json();
      const filteredProducts = allProducts.filter(p => p.id !== product.id);
      setAvailableProducts(filteredProducts);

      // 获取当前产品的关系（作为初始状态）
      const relationsRes = await apiClient(`${apiUrl}/${product.id}/relations`);
      const rawData = await relationsRes.json();
      setRelations(parseRelationsData(rawData));

    } catch (err) {
      console.error('获取数据失败:', err);
      setErrorMessage('加载关系数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [product.id, apiUrl]);

  // 过滤可用产品（排除所有已关联的产品，无论什么关系类型）
  const filteredProducts = useMemo(() => {
    // 获取所有已关联的产品ID（无论什么关系类型）
    const relatedIds = new Set(relations.map(r => r.targetProduct.id));

    return availableProducts.filter(p => {
      // 排除所有已关联的产品（无论是什么关系类型）
      return !relatedIds.has(p.id);
    });
  }, [availableProducts, relations]);

  // 按类型分组的关系
  const groupedRelations = useMemo(() => {
    const groups = { compatible: [], upgrade: [], replacement: [] };
    relations.forEach(relation => {
      if (groups[relation.relationType]) {
        groups[relation.relationType].push(relation);
      }
    });
    return groups;
  }, [relations]);

  // 添加关系（仅更新前端临时状态）
  const addRelation = () => {
    if (!selectedProductId || !selectedRelationType) {
      setErrorMessage('请选择产品和关系类型');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    const targetProduct = availableProducts.find(p => p.id === Number(selectedProductId));
    if (!targetProduct) return;

    // ✅ 增强验证：检查是否已经以任何关系类型关联了该产品
    const isAlreadyRelated = relations.some(r => r.targetProduct.id === targetProduct.id);

    if (isAlreadyRelated) {
      // 找出已有的关系类型
      const existingRelation = relations.find(r => r.targetProduct.id === targetProduct.id);
      const existingType = relationTypes.find(t => t.id === existingRelation.relationType)?.name || existingRelation.relationType;
      const newType = relationTypes.find(t => t.id === selectedRelationType)?.name || selectedRelationType;

      setErrorMessage(`该产品已经作为【${existingType}】关联。请先移除现有关系再重新添加。`);
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    const newRelation = {
      targetProduct,
      relationType: selectedRelationType
    };
    setRelations(prev => [...prev, newRelation]);
    setSelectedProductId('');
  };

  // 移除关系（仅更新前端临时状态）
  const removeRelation = (index) => {
    setRelations(prev => prev.filter((_, i) => i !== index));
  };

  // 辅助函数：在保存前去重
  const deduplicateRelations = (relationsArray) => {
    const seen = new Map(); // key: productId, value: relationType

    return relationsArray.filter(relation => {
      const key = `${relation.targetProduct.id}-${relation.relationType}`;

      if (seen.has(key)) {
        return false; // 重复，过滤掉
      }

      seen.set(key, true);
      return true;
    });
  };

  // ✅ 批量保存 - 关键：完全替换状态
  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorMessage('');

      // 先去重，确保数据一致性
      const uniqueRelations = deduplicateRelations(relations);

      // 按类型分组 ID
      const compatible = [];
      const upgrade = [];
      const replacement = [];

      uniqueRelations.forEach(rel => {
        if (rel.relationType === 'compatible') {
          compatible.push(rel.targetProduct.id);
        } else if (rel.relationType === 'upgrade') { // ✅ 添加 upgrade 处理
          upgrade.push(rel.targetProduct.id);
        } else if (rel.relationType === 'replacement') {
          replacement.push(rel.targetProduct.id);
        }
      });

      // 发送保存请求
      const res = await apiClient(`${apiUrl}/${product.id}/relations`, {
        method: 'PUT',
        body: JSON.stringify({ compatible,upgrade,replacement })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || '保存失败');
      }

      // ✅ 关键修复：完全替换为后端返回的真实数据
      const updatedRes = await apiClient(`${apiUrl}/${product.id}/relations`);
      const updatedRawData = await updatedRes.json();

      // 确保数据去重
      const parsedData = parseRelationsData(updatedRawData);
      const uniqueParsedData = deduplicateRelations(parsedData);
      setRelations(uniqueParsedData); // ← 使用去重后的数据

      if (onSave) onSave();
      setShowSuccessDialog(true);

    } catch (err) {
      console.error('保存失败:', err);
      setErrorMessage('保存失败：' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // 渲染关系项
  const renderRelationItem = (relation, index) => {
    const typeConfig = relationTypes.find(t => t.id === relation.relationType);
    const product = relation.targetProduct;
    const imageUrl = getProductImageUrl(product);
    const hasImage = !!imageUrl;

    return (
      <div
        key={`${product.id}-${relation.relationType}-${index}`}
        className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${typeConfig?.color || 'bg-gray-100'}`}>
              <span>{typeConfig?.name}</span>
            </span>
          </div>

          <button
            onClick={() => removeRelation(index)}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="移除关联"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-start space-x-4">
          {/* 产品图片 - 简化版，无悬停效果 */}
          <div className="relative flex-shrink-0">
            {hasImage ? (
              <div className="relative">
                <img
                  src={imageUrl}
                  alt={product.model || '产品图片'}
                  className="w-16 h-16 object-cover rounded border"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.querySelector('.img-placeholder').style.display = 'flex';
                  }}
                />
                <div className="img-placeholder hidden w-16 h-16 bg-gray-100 rounded border flex items-center justify-center">
                  <ImageIcon size={24} className="text-gray-400" />
                </div>
              </div>
            ) : (
              <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center">
                <ImageIcon size={24} className="text-gray-400" />
              </div>
            )}
          </div>

          {/* 产品信息 */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">
              {product.model || '未命名产品'}
            </h4>
            <p className="text-sm text-gray-600">
              {product.brand && `${product.brand} • `}
              {product.sku || product.productType || 'N/A'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ID: {product.id}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // 成功提示对话框
  const SuccessDialog = () => {
    if (!showSuccessDialog) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={() => setShowSuccessDialog(false)} />
        <div className="relative z-10 bg-white rounded-xl p-6 max-w-md mx-4 shadow-xl">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">保存成功！</h3>
            <p className="text-gray-600 mb-6">产品关系已成功更新。</p>
            <div className="flex justify-center">
              <button
                onClick={() => setShowSuccessDialog(false)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 错误提示
  const ErrorAlert = () => {
    if (!errorMessage) return null;

    return (
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <X className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setErrorMessage('')}
                className="text-red-400 hover:text-red-600"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="border-b px-6 py-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                产品关系管理
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                {product.model || '未命名产品'} • {product.brand || '未知品牌'} • ID: {product.id}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* 主要内容 */}
        <div className="flex-1 overflow-hidden flex">
          {/* 左侧：添加关系表单 */}
          <div className="w-1/3 border-r p-6 overflow-y-auto">
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-4">添加新关联</h3>

              {/* 关系类型选择 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  关系类型
                </label>
                <select
                  value={selectedRelationType}
                  onChange={(e) => setSelectedRelationType(e.target.value)}
                  className="w-full px-3 py-2 border rounded transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">-- 请选择关联类型 --</option>
                  {relationTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 产品选择下拉框 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择产品
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 border rounded transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={filteredProducts.length === 0}
                >
                  <option value="">-- 请选择关联产品 --</option>
                  {filteredProducts.map(prod => (
                    <option key={prod.id} value={prod.id}>
                      {prod.model || '未命名产品'} ({prod.brand || '未知品牌'})
                    </option>
                  ))}
                </select>
                {filteredProducts.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">无可用产品</p>
                )}
              </div>

              {/* 添加按钮 */}
              <button
                onClick={addRelation}
                disabled={!selectedProductId || !selectedRelationType}
                className={`w-full py-2 rounded-lg font-medium transition-colors ${
                  (!selectedProductId || !selectedRelationType)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                添加关联
              </button>
            </div>

            {/* 可用产品统计 */}
            <div className="text-sm text-gray-500">
              <p>可用产品: {filteredProducts.length} 个</p>
              <p>已关联产品: {relations.length} 个</p>
            </div>
          </div>

          {/* 右侧：关系列表 */}
          <div className="w-2/3 p-6 overflow-y-auto">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-900">已选的关联</h3>
                <div className="flex items-center space-x-2">
                  <Filter size={16} className="text-gray-400" />
                  <select
                    value={activeRelationType}
                    onChange={(e) => setActiveRelationType(e.target.value)}
                    className="border rounded px-3 py-1 text-sm transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">全部关系类型</option>
                    {relationTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 关系列表 */}
              <div className="space-y-4">
                {relations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>尚未添加任何产品关系</p>
                  </div>
                ) : (
                  relations
                    .filter(rel =>
                      activeRelationType === 'all' ||
                      rel.relationType === activeRelationType
                    )
                    .map((relation, index) => renderRelationItem(relation, index))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="border-t px-6 py-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              已选关联总计 {relations.length} 个关系 •
              匹配: {groupedRelations.compatible?.length || 0} •
              升级: {groupedRelations.upgrade?.length || 0} •
              替代: {groupedRelations.replacement?.length || 0}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={saving}
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    保存中...
                  </>
                ) : (
                  '保存关系'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 成功提示对话框 */}
      <SuccessDialog />

      {/* 错误提示 */}
      <ErrorAlert />
    </div>
  );
};

export default ProductRelationsManager;
