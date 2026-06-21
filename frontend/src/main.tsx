import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { store } from './app/store';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { VerifyOtpPage } from './features/auth/pages/VerifyOtpPage';
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from './features/auth/pages/ResetPasswordPage';
import { ProfilePage } from './features/profile/pages/ProfilePage';
import { ChangePasswordPage } from './features/profile/pages/ChangePasswordPage';
import { HomePage } from './features/catalog/pages/HomePage';
import { CatalogPage } from './features/catalog/pages/CatalogPage';
import { BookDetailPage } from './features/catalog/pages/BookDetailPage';
import { VendorBooksPage } from './features/vendor/pages/VendorBooksPage';
import { VendorBookFormPage } from './features/vendor/pages/VendorBookFormPage';
import { CartPage } from './features/cart/pages/CartPage';
import { CheckoutPage } from './features/orders/pages/CheckoutPage';
import { CheckoutQrPage } from './features/orders/pages/CheckoutQrPage';
import { RequireAuth, RequireRole } from './shared/auth/guards';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          {/* Public: Home (guests + logged-in users) */}
          <Route path="/" element={<HomePage />} />
          <Route path="/books" element={<CatalogPage />} />
          <Route path="/books/:idOrSlug" element={<BookDetailPage />} />

          {/* Auth routes (guest only) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected: any authenticated user */}
          <Route element={<RequireAuth />}>
            <Route path="/user/profile" element={<ProfilePage />} />
            <Route path="/user/change-password" element={<ChangePasswordPage />} />
          </Route>

          {/* Protected: chỉ role 'user' — vendor/admin/manager không được vào /cart (tránh gọi GET /cart → 403) */}
          <Route element={<RequireRole roles={['user']} />}>
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/checkout/:code" element={<CheckoutQrPage />} />
          </Route>

          {/* Protected: vendor only */}
          <Route element={<RequireRole roles={['vendor']} />}>
            <Route path="/vendor/dashboard" element={<div className="p-10 text-ink">Vendor Dashboard</div>} />
            <Route path="/vendor/books" element={<VendorBooksPage />} />
            <Route path="/vendor/books/new" element={<VendorBookFormPage />} />
            <Route path="/vendor/books/:id/edit" element={<VendorBookFormPage />} />
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
