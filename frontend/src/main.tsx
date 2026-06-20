import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { store } from './app/store';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { VerifyOtpPage } from './features/auth/pages/VerifyOtpPage';
import { RequireAuth, RequireRole } from './shared/auth/guards';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          {/* Auth routes (guest only) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />

          {/* Protected: any authenticated user */}
          <Route element={<RequireAuth />}>
            <Route path="/" element={<div className="mx-auto max-w-container p-10 text-ink">ATHENA — authenticated</div>} />
          </Route>

          {/* Protected: vendor only */}
          <Route element={<RequireRole roles={['vendor']} />}>
            <Route path="/vendor/dashboard" element={<div className="p-10 text-ink">Vendor Dashboard</div>} />
          </Route>

          {/* Protected: admin/manager only */}
          <Route element={<RequireRole roles={['admin', 'manager']} />}>
            <Route path="/admin/dashboard" element={<div className="p-10 text-ink">Admin Dashboard</div>} />
          </Route>

          {/* Utility */}
          <Route path="/403" element={<div className="p-10 text-ink">403 — Không có quyền truy cập</div>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
);
