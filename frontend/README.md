# UTEShop Frontend

Ứng dụng frontend cho UTEShop - nền tảng thương mại điện tử.

## Tổng quan

Ứng dụng React được xây dựng với:
- **React 18** - Thư viện UI
- **Vite** - Build tool và dev server
- **React Router v6** - Client-side routing
- **Redux Toolkit** - State management
- **React Hook Form** - Form handling và validation
- **Tailwind CSS** - Styling
- **Axios** - HTTP client

## Tính năng

- **Xác thực người dùng**: Đăng ký, đăng nhập, xác thực email, khôi phục mật khẩu
- **Quản lý hồ sơ**: Xem và cập nhật thông tin cá nhân
- **Phân quyền**: Hỗ trợ role user và admin
- **Responsive**: Tối ưu cho mobile, tablet, desktop
- **Bảo mật**: JWT authentication với token lưu trữ an toàn

## Cấu trúc dự án

```
frontend/
├── public/              # Static assets
│   └── favicon.ico
├── src/
│   ├── components/      # Reusable components
│   │   ├── common/      # Button, Input, Card, Spinner, Alert
│   │   ├── layout/      # Header, Footer, Layout
│   │   ├── auth/        # Auth form components
│   │   └── profile/     # Profile-related components
│   ├── pages/           # Page components
│   │   ├── Home.jsx
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── ForgotPasswordPage.jsx
│   │   ├── ResetPasswordPage.jsx
│   │   ├── VerifyEmailPage.jsx
│   │   ├── ProfilePage.jsx
│   │   └── AdminProfilePage.jsx
│   ├── services/        # API services
│   │   ├── api.js       # Axios instance với interceptors
│   │   ├── authService.js
│   │   ├── userService.js
│   │   └── adminService.js
│   ├── store/           # Redux store
│   │   ├── index.js
│   │   ├── slices/
│   │   │   ├── authSlice.js
│   │   │   └── userSlice.js
│   │   └── selectors/
│   │       ├── authSelectors.js
│   │       └── userSelectors.js
│   ├── utils/
│   │   └── storage.js   # localStorage helpers
│   ├── routes/
│   │   └── (route guards integrated in App.jsx)
│   ├── App.jsx          # Main app component với routing
│   ├── main.jsx         # Entry point với Provider setup
│   └── index.css        # Tailwind CSS directives
├── .env.development     # Development environment variables
├── .env.production      # Production environment variables
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── postcss.config.js    # PostCSS configuration
└── package.json
```

## Bắt đầu nhanh

### Yêu cầu

- Node.js 18+
- Backend API đang chạy tại `http://localhost:3000`

### Cài đặt

```bash
cd frontend
npm install
```

### Cấu hình môi trường

Sao chép file `.env.development` và chỉnh sửa nếu cần:

```env
VITE_API_URL=http://localhost:3000
```

### Chạy development server

```bash
npm run dev
```

Ứng dụng sẽ chạy tại: **http://localhost:5173**

### Build production

```bash
npm run build
```

Output được tạo vào thư mục `dist/`.

### Preview production build

```bash
npm run preview
```

## API Integration

Frontend kết nối với backend API thông qua Axios instance được cấu hình trong `src/services/api.js`.

### Base URL
- Development: `http://localhost:3000` (được proxy qua Vite)
- Production: Định nghĩa trong `.env.production`

### Authentication
JWT token được lưu trong localStorage và tự động được thêm vào request headers qua Axios interceptor.

### API Endpoints đã tích hợp:

#### Authentication
- `POST /api/v1/auth/register` - Đăng ký tài khoản
- `POST /api/v1/auth/verify-email` - Xác thực email
- `POST /auth/forgot-password` - Yêu cầu đặt lại mật khẩu
- `POST /auth/reset-password` - Đặt lại mật khẩu
- `POST /auth/login` - Đăng nhập

#### User
- `GET /user/profile` - Lấy thông tin người dùng
- `PUT /user/profile` - Cập nhật thông tin người dùng

#### Admin
- `GET /admin/profile` - Lấy thông tin admin

## State Management

Redux Toolkit được sử dụng để quản lý state toàn cục.

### Store structure

```javascript
{
  auth: {
    token,
    user,
    isAuthenticated,
    isLoading,
    error
  },
  user: {
    profile,
    isLoading,
    error
  }
}
```

### Async Thunks
- `loginAsync(credentials)`
- `registerAsync(userData)`
- `verifyEmailAsync(data)`
- `forgotPasswordAsync(email)`
- `resetPasswordAsync(data)`
- `getProfileAsync()`
- `updateProfileAsync(data)`

### Selectors
- `selectIsAuthenticated`
- `selectUser`
- `selectToken`
- `selectProfile`
- `selectAuthLoading`
- `selectUserLoading`
- `selectAuthError`
- `selectUserError`

## Routing

Sử dụng React Router v6 với route guards:

- **Public routes** (chỉ truy cập khi chưa đăng nhập): `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`
- **Private routes** (yêu cầu đăng nhập): `/profile`
- **Admin routes** (chỉ admin): `/admin/profile`

### Route Guards
- `PublicRoute`: Chuyển hướng đến `/profile` nếu đã đăng nhập
- `PrivateRoute`: Chuyển hướng đến `/login` nếu chưa đăng nhập
- `AdminRoute`: Kiểm tra role === 'admin', chuyển hướng nếu không có quyền

## Form Validation

React Hook Form được sử dụng cho tất cả các form với validation rules khớp với backend:

- **Email**: Bắt buộc, phải là email hợp lệ
- **Mật khẩu**: Tối thiểu 6 ký tự, chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số
- **Xác nhận mật khẩu**: Phải khớp với mật khẩu
- **Số điện thoại**: 10-11 số (tùy chọn)
- **OTP**: 6 chữ số
- **Họ và tên**: Bắt buộc, 2-100 ký tự

## Styling

Tailwind CSS được sử dụng với custom color palette:

- **Primary**: Màu xanh dương (`#2563eb`)
- Responsive breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Mobile-first approach
- Custom component classes

## Error Handling

### Global Error Handling
- Axios interceptors xử lý 401/403 → logout và redirect
- Network errors → thông báo kết nối
- API errors → hiển thị message từ backend

### Form Errors
- Validation errors hiển thị ngay bên dưới input
- API errors hiển thị dưới dạng Alert component
- Submit button disabled trong khi loading

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint (nếu đã cấu hình)

### ESLint Configuration
Đã cài đặt ESLint với plugins:
- `eslint-plugin-react`
- `eslint-plugin-react-hooks`
- `eslint-plugin-react-refresh`

### Debugging
- Kiểm tra console cho errors/warnings
- Redux DevTools extension để inspect state
- Network tab trong browser DevTools cho API calls

## Testing

Chưa có unit tests. Manual testing được thực hiện thông qua các trang:

### Authentication Flow
1. Đăng ký với email hợp lệ
2. Kiểm tra Mailtrap inbox cho OTP
3. Xác thực email
4. Đăng nhập
5. Xem và cập nhật profile
6. Đăng xuất

### Password Reset Flow
1. Click "Quên mật khẩu?"
2. Nhập email
3. Kiểm tra Mailtrap cho OTP
4. Nhập OTP và mật khẩu mới
5. Đăng nhập với mật khẩu mới

### Edge Cases
- Đăng ký với email đã tồn tại
- Đăng nhập với mật khẩu sai
- Truy cập `/profile` không có token
- Truy cập `/admin/profile` với user thường
- Token hết hạn
- Rate limiting (spam submit)

## Deployment

### Production Build
```bash
npm run build
```

Build output sẽ được tạo vào `dist/` directory.

### Environment Variables for Production

Tạo `.env.production`:

```env
VITE_API_URL=https://api.uteshop.com
```

### Deploy to any static hosting
- Build ứng dụng: `npm run build`
- Upload thư mục `dist/` đến hosting service (Netlify, Vercel, Firebase, etc.)
- Cấu hình redirect rules cho SPA (all routes → index.html)

## Cấu hình Vite

File `vite.config.js` cấu hình:
- Dev server port: 5173
- Proxy `/api` đến backend (localhost:3000) trong development
- React plugin với Fast Refresh

## Cấu hình Tailwind

File `tailwind.config.js`:
- Content paths: `./index.html` và `./src/**/*.{js,ts,jsx,tsx}`
- Custom color palette với màu primary
- Không có plugins đặc biệt

## Bảo mật

- **JWT Token**: Lưu trong localStorage (có thể xem xét sessionStorage cho security cao hơn)
- **HTTPS**: Production phải chạy trên HTTPS
- **CORS**: Backend đã cấu hình CORS cho localhost:5173
- **XSS**: React tự động escape values, tránh `dangerouslySetInnerHTML`
- **CSRF**: Không cần với JWT trong localStorage

## Hỗ trợ Browser

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Kiến trúc

### 3-Tier trong Frontend
1. **Components/Pages** - Presentation layer
2. **Services** - API communication layer
3. **Store (Redux)** - State management layer

### Data Flow
1. Component dispatch Redux action (async thunk)
2. Async thunk gọi service method
3. Service gọi API qua Axios instance
4. Response trả về component qua Redux state
5. Component re-render với state mới

## Các thư viện chính

| Thư viện | Mục đích | Version |
|----------|----------|---------|
| react | UI library | ^18.2.0 |
| react-dom | React renderer | ^18.2.0 |
| react-router-dom | Routing | ^6.20.0 |
| @reduxjs/toolkit | Redux utilities | ^2.0.0 |
| react-redux | React-Redux bindings | ^9.0.0 |
| axios | HTTP client | ^1.6.0 |
| react-hook-form | Form handling | ^7.48.0 |
| tailwindcss | CSS framework | ^3.4.0 |

## Ghi chú

- Backend API cần chạy trên port 3000 để các proxy requests hoạt động
- Email OTP được gửi qua Mailtrap trong development
- Tất cả validation rules phải khớp với backend
- Lưu ý các rate limits khi test (3-5 requests/phút tùy endpoint)

## Câu hỏi thường gặp

### Lỗi "Network Error"
Kiểm tra backend server có đang chạy không và đúng port (3000).

### Lỗi 403 "Email chưa được xác thực"
Đăng ký tài khoản mới và xác thực email trước khi đăng nhập.

### Token hết hạn
JWT token có thời hạn 24h. Sau đó cần đăng nhập lại.

### OTP không nhận được
Trong development, kiểm tra Mailtrap inbox. OTP hết hạn sau 10 phút.

## Liên kết

- **Backend Documentation**: `../backend/CLAUDE.md`
- **API Specifications**: `../docs/backend/spec/`
- **Database Documentation**: `../docs/database/`

---

