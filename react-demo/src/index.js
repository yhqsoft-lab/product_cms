//src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter as Router } from 'react-router-dom';
import { UserProvider } from './context/useUser';
import { ToastProvider } from './components/ToastProvider';

ReactDOM.createRoot(document.getElementById('root')).render(
  <UserProvider>
    <ToastProvider>
      <Router>
        <App />
      </Router>
    </ToastProvider>
  </UserProvider>
);
