// src/components/ProductRelations/useProductRelations.js
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { CheckCircle, RefreshCw } from 'lucide-react';
import { apiClient } from '../../utils/apiClient';

export const RELATION_TYPES = [
  {
    id: 'compatible',
    name: '可匹配产品',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: CheckCircle
  },
  {
    id: 'upgrade',
    name: '升级款产品',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: RefreshCw
  },
  {
    id: 'replacement',
    name: '可替代产品',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: RefreshCw
  }
];

/**
 * 解析后端返回的关系数据，确保同一产品只保留一种关系类型
 */
const parseRelationsData = (rawData) => {
  const payload = rawData?.success && rawData?.data ? rawData.data : (rawData || {});

  const groups = [
    { type: 'compatible', list: Array.isArray(payload.compatible) ? payload.compatible : [] },
    { type: 'upgrade', list: Array.isArray(payload.upgrade) ? payload.upgrade : [] },
    { type: 'replacement', list: Array.isArray(payload.replacement) ? payload.replacement : [] }
  ];

  const processedIds = new Set();
  const result = [];

  for (const { type, list } of groups) {
    for (const item of list) {
      if (item && !processedIds.has(item.id)) {
        processedIds.add(item.id);
        result.push({ targetProduct: item, relationType: type });
      }
    }
  }

  return result;
};

/**
 * 保存前按产品 ID 去重
 */
const deduplicateRelations = (relationsArray) => {
  const seenIds = new Set();
  return relationsArray.filter((rel) => {
    const targetId = rel?.targetProduct?.id;
    if (!targetId || seenIds.has(targetId)) return false;
    seenIds.add(targetId);
    return true;
  });
};

export const useProductRelations = (productId, apiUrl, onSave) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [relations, setRelations] = useState([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const errorTimerRef = useRef(null);

  const showError = useCallback((msg, duration = 3000) => {
    setErrorMessage(msg);
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
    }
    if (duration > 0) {
      errorTimerRef.current = setTimeout(() => {
        setErrorMessage('');
        errorTimerRef.current = null;
      }, duration);
    }
  }, []);

  const clearError = useCallback(() => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    setErrorMessage('');
  }, []);

  // 卸载时清理定时器
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
      }
    };
  }, []);

  // 并发拉取产品列表与当前产品关系
  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      if (!productId) return;

      try {
        setLoading(true);
        clearError();

        const [productsRes, relationsRes] = await Promise.all([
          apiClient(`${apiUrl}?pageSize=100`),
          apiClient(`${apiUrl}/${productId}/relations`)
        ]);

        if (!productsRes.ok || !relationsRes.ok) {
          throw new Error('接口请求失败');
        }

        const [productsJson, relationsJson] = await Promise.all([
          productsRes.json(),
          relationsRes.json()
        ]);

        if (ignore) return;

        // 兼容直接返回数组与 { success, data } 包装格式
        const allProducts = Array.isArray(productsJson)
          ? productsJson
          : (Array.isArray(productsJson?.data) ? productsJson.data : []);

        setAvailableProducts(allProducts.filter((p) => p.id !== productId));
        setRelations(parseRelationsData(relationsJson));
      } catch (err) {
        if (!ignore) {
          console.error('获取数据失败:', err);
          showError('加载关系数据失败', 0);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      ignore = true;
    };
  }, [productId, apiUrl, clearError, showError]);

  // 过滤出尚未关联的产品
  const filteredProducts = useMemo(() => {
    const relatedIds = new Set(relations.map((r) => r.targetProduct.id));
    return availableProducts.filter((p) => !relatedIds.has(p.id));
  }, [availableProducts, relations]);

  // 按关系类型分组统计
  const groupedRelations = useMemo(() => {
    const groups = { compatible: [], upgrade: [], replacement: [] };
    relations.forEach((rel) => {
      if (groups[rel.relationType]) {
        groups[rel.relationType].push(rel);
      }
    });
    return groups;
  }, [relations]);

  // 添加关系（前端临时状态）
  const addRelation = useCallback(
    (selectedProductId, selectedRelationType) => {
      if (!selectedProductId || !selectedRelationType) {
        showError('请选择产品和关系类型');
        return false;
      }

      const targetId = Number(selectedProductId);
      const targetProduct = availableProducts.find((p) => p.id === targetId);
      if (!targetProduct) return false;

      const existingRelation = relations.find((r) => r.targetProduct.id === targetId);
      if (existingRelation) {
        const existingTypeName =
          RELATION_TYPES.find((t) => t.id === existingRelation.relationType)?.name ||
          existingRelation.relationType;
        showError(`该产品已经作为【${existingTypeName}】关联，请先移除后再重新添加。`);
        return false;
      }

      setRelations((prev) => [
        ...prev,
        { targetProduct, relationType: selectedRelationType }
      ]);
      return true;
    },
    [availableProducts, relations, showError]
  );

  // 按产品 ID 移除关系（修复筛选态下按 index 误删的 Bug）
  const removeRelation = useCallback((targetProductId) => {
    setRelations((prev) => prev.filter((r) => r.targetProduct.id !== targetProductId));
  }, []);

  // 批量保存并同步后端最新状态
  const saveRelations = useCallback(async () => {
    try {
      setSaving(true);
      clearError();

      const uniqueRelations = deduplicateRelations(relations);
      const payload = { compatible: [], upgrade: [], replacement: [] };

      uniqueRelations.forEach((rel) => {
        if (payload[rel.relationType]) {
          payload[rel.relationType].push(rel.targetProduct.id);
        }
      });

      const res = await apiClient(`${apiUrl}/${productId}/relations`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || '保存失败');
      }

      // 回查最新数据保持前后端一致
      const updatedRes = await apiClient(`${apiUrl}/${productId}/relations`);
      if (updatedRes.ok) {
        const updatedRawData = await updatedRes.json();
        setRelations(deduplicateRelations(parseRelationsData(updatedRawData)));
      }

      if (onSave) onSave();
      setShowSuccessDialog(true);
    } catch (err) {
      console.error('保存失败:', err);
      showError('保存失败：' + err.message, 5000);
    } finally {
      setSaving(false);
    }
  }, [relations, apiUrl, productId, onSave, clearError, showError]);

  return {
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
  };
};
