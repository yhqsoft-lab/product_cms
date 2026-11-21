// src/components/IdleWarningDialog.jsx
import React from 'react';

export default function IdleWarningDialog({ onContinue, onLogout }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center mb-4">
          <svg className="w-6 h-6 text-yellow-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-bold text-gray-800">会话即将超时</h3>
        </div>

        <p className="text-gray-600 mb-6">
          您已长时间未操作，会话将在 <span className="font-bold text-red-500">2 分钟</span> 后自动退出。
          <br />
          是否继续当前会话？
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onLogout}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            退出登录
          </button>
          <button
            onClick={onContinue}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            继续会话
          </button>
        </div>
      </div>
    </div>
  );
}
