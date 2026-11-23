// src/components/ProductRelations/RelationCard.jsx
import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { RELATION_TYPES } from './useProductRelations';

const getProductImageUrl = (product) => {
  if (!product) return null;
  if (product.imageUrl) return product.imageUrl;
  if (Array.isArray(product.images) && product.images.length > 0) return product.images[0];
  if (typeof product.image === 'string' && product.image.trim() !== '') return product.image;
  return null;
};

const RelationCard = ({ relation, onRemove }) => {
  const { targetProduct: product, relationType } = relation;
  const typeConfig = RELATION_TYPES.find((t) => t.id === relationType);
  const imageUrl = getProductImageUrl(product);

  const [imgError, setImgError] = useState(false);

  // 图片地址变化时重置错误状态
  useEffect(() => {
    setImgError(false);
  }, [imageUrl]);

  const showImage = Boolean(imageUrl) && !imgError;

  return (
    <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              typeConfig?.color || 'bg-gray-100 text-gray-800'
            }`}
          >
            {typeConfig?.name || relationType}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onRemove(product.id)}
          className="text-gray-400 hover:text-red-500 transition-colors"
          title="移除关联"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          {showImage ? (
            <img
              src={imageUrl}
              alt={product.model || '产品图片'}
              className="w-16 h-16 object-cover rounded border"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center">
              <ImageIcon size={24} className="text-gray-400" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">
            {product.model || '未命名产品'}
          </h4>
          <p className="text-sm text-gray-600">
            {product.brand && `${product.brand} • `}
            {product.sku || product.productType || 'N/A'}
          </p>
          <p className="text-xs text-gray-500 mt-1">ID: {product.id}</p>
        </div>
      </div>
    </div>
  );
};

export default RelationCard;
