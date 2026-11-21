// components/ToastProvider.jsx
import React, { createContext, useState } from 'react';

export const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const success = (message) => addToast(message, 'success');
  const error = (message) => addToast(message, 'error');
  const info = (message) => addToast(message, 'info');
  const warning = (message) => addToast(message, 'warning');

  return (
    <ToastContext.Provider value={{ success, error, info, warning }}>
      {children}

      {/* Toast 提示 */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 text-white rounded shadow-lg ${
              toast.type === 'success' ? 'bg-green-600'
              : toast.type === 'error' ? 'bg-red-600'
              : toast.type === 'info' ? 'bg-blue-600'
              : 'bg-yellow-600'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
