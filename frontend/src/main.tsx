import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './Style/global.css';
import { AuthProvider } from './context/AuthContext';

const root = document.getElementById('root');

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
       <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>,
  );
}
