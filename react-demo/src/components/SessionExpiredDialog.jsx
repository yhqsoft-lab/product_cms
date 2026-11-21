// src/components/SessionExpiredDialog.jsx
import React from 'react';

const SessionExpiredDialog = ({ onRelogin }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
        <div className="p-6">
          <div className="text-center">
            <svg
              className="w-16 h-16 mx-auto text-yellow-500 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>

            <h3 className="text-xl font-bold text-gray-800 mb-3">
              会话即将过期
            </h3>

            <p className="text-gray-600 mb-6">
              因超过30分钟闲置，请重新登录以继续操作。
            </p>

            <div className="flex justify-center">
                <button
                onClick={onRelogin}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 transition-colors w-full max-w-[140px]"
                 >
                   重新登录
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionExpiredDialog;
