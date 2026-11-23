// src/components/ProductRelations/ProductRelationsManager.jsx
import React, { useState, useMemo } from 'react';
import { Filter, X, CheckCircle, Package } from 'lucide-react';
import { useProductRelations, RELATION_TYPES } from './useProductRelations';
import RelationCard from './RelationCard';

const SuccessDialog = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-xl p-6 max-w-md mx-4 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">保存成功！</h3>
          <p className="text-gray-600 mb-6">产品关系已成功更新。</p>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onClose}
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

const ErrorAlert = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <X className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{message}</p>
          </div>
          <div className="ml-auto pl-3">
            <button
              type="button"
              onClick={onClose}
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

const ProductRelationsManager = ({
  product,
  onClose,
  onSave,
  apiUrl = '/api/products'
}) => {
  const {
    loading,
    saving,
    relations,
    filteredProducts,
    groupedRelations,
    showSuccessDialog,
    setShowSuccessDialog,
    errorMessage,
    clearError,
    addRelation,
    removeRelation,
    saveRelations
  } = useProductRelations(product?.id, apiUrl, onSave);

  const [activeRelationType, setActiveRelationType] = useState('all');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedRelationType, setSelectedRelationType] = useState('');

  const displayedRelations = useMemo(() => {
    if (activeRelationType === 'all') return relations;
    return relations.filter((rel) => rel.relationType === activeRelationType);
  }, [relations, activeRelationType]);

  const handleAdd = () => {
    const added = addRelation(selectedProductId, selectedRelationType);
    if (added) {
      setSelectedProductId('');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600" />
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="border-b px-6 py-4 bg-gray-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">产品关系管理</h2>
            <p className="text-gray-600 text-sm mt-1">
              {product.model || '未命名产品'} • {product.brand || '未知品牌'} • ID: {product.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* 主体区域 */}
        <div className="flex-1 overflow-hidden flex">
          {/* 左侧：添加表单 */}
          <div className="w-1/3 border-r p-6 overflow-y-auto">
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-4">添加新关联</h3>

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
                  {RELATION_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

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
                  {filteredProducts.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.model || '未命名产品'} ({prod.brand || '未知品牌'})
                    </option>
                  ))}
                </select>
                {filteredProducts.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">无可用产品</p>
                )}
              </div>

              <button
                type="button"
                onClick={handleAdd}
                disabled={!selectedProductId || !selectedRelationType}
                className={`w-full py-2 rounded-lg font-medium transition-colors ${
                  !selectedProductId || !selectedRelationType
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                添加关联
              </button>
            </div>

            <div className="text-sm text-gray-500">
              <p>可用产品: {filteredProducts.length} 个</p>
              <p>已关联产品: {relations.length} 个</p>
            </div>
          </div>

          {/* 右侧：关联列表 */}
          <div className="w-2/3 p-6 overflow-y-auto">
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
                  {RELATION_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {displayedRelations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>
                    {relations.length === 0
                      ? '尚未添加任何产品关系'
                      : '当前筛选条件下无关联产品'}
                  </p>
                </div>
              ) : (
                displayedRelations.map((relation) => (
                  <RelationCard
                    key={`${relation.targetProduct.id}-${relation.relationType}`}
                    relation={relation}
                    onRemove={removeRelation}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="border-t px-6 py-4 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            已选关联总计 {relations.length} 个关系 •
            匹配: {groupedRelations.compatible.length} •
            升级: {groupedRelations.upgrade.length} •
            替代: {groupedRelations.replacement.length}
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              取消
            </button>
            <button
              type="button"
              onClick={saveRelations}
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2" />
                  保存中...
                </>
              ) : (
                '保存关系'
              )}
            </button>
          </div>
        </div>
      </div>

      <SuccessDialog
        open={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
      />
      <ErrorAlert message={errorMessage} onClose={clearError} />
    </div>
  );
};

export default ProductRelationsManager;
