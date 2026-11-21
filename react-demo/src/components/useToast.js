// src/components/useToast.js
import React, { useContext } from 'react';
import { ToastContext } from './ToastProvider';

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast 必须在 ToastProvider 内部使用');
  }
  return context;
}
