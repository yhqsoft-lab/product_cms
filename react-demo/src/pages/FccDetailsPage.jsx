// pages/FccDetailsPage.jsx
import React, { useState, useEffect } from 'react';
import FccManagement from '../components/FccManagement';

export default function FccDetailsPage({ fccId }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-indigo-600">FCC 产品管理</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <FccManagement fccId={fccId} />
      </main>
    </div>
  );
}
