# UTEShop Backend API

Backend API cho ứng dụng e-commerce UTEShop sử dụng Express.js, Node.js, MySQL với kiến trúc 3 tầng.

## Tính năng

- **Authentication**:
  - Register với validation và rate limiting
  - Email verification với OTP
  - Login với JWT
  - Forgot/Reset password với OTP qua email
  - Role-based authorization (user, admin)

- **Kiến trúc**: 3 tầng (Presentation - Business - Data Access)
- **Database**: MySQL với Sequelize ORM
- **Authentication**: JWT (JSON Web Token)
- **Validation**: express-validator
- **Email**: Nodemailer với Mailtrap (test environment)

## Cấu trúc thư mục

```
backend/
├── src/
│   ├── config/           # Cấu hình (database, email, jwt)
│   ├── controllers/      # Xử lý request/response
│   ├── middleware/       # Auth, validation, rate limiting
│   ├── models/           # Sequelize models
│   ├── repositories/     # Data access layer
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── utils/            # Helper functions
│   └── app.js            # Express app
├── tests/                # Postman collection
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Cài đặt

### Yêu cầu
- Node.js 16+
- MySQL 8.0+
- NPM hoặc Yarn

### Setup

1. **Clone repository và vào thư mục backend**
   ```bash
   cd backend
   ```

2. **Cài đặt dependencies**
   ```bash
   npm install
   ```

3. **Cấu hình environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Chỉnh sửa file `.env` với thông tin database và email của bạn:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
   - `JWT_SECRET` (tạo một chuỗi bí mật mạnh)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (nếu dùng Mailtrap, lấy từ dashboard)

4. **Tạo database MySQL**
   ```sql
   CREATE DATABASE uteshop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

5. **Chạy server**
   ```bash
   npm run dev
   ```
   
   Server sẽ chạy tại `http://localhost:3000`

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Đăng ký user mới |
| POST | `/api/v1/auth/verify-email` | Xác thực email với OTP |
| POST | `/api/v1/auth/forgot-password` | Yêu cầu reset mật khẩu |
| POST | `/api/v1/auth/reset-password` | Reset mật khẩu với OTP |
| POST | `/api/v1/auth/login` | Đăng nhập |

### Protected Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/v1/user/profile` | Lấy thông tin profile | user, admin |
| PUT | `/api/v1/user/profile` | Cập nhật profile | user, admin |
| GET | `/api/v1/admin/profile` | Lấy thông tin admin | admin |

### Other
- `GET /health` - Health check

## Request/Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## Testing

Import file `tests/auth-api-tests.json` vào Postman để test tất cả các endpoint.

### Flow test:

1. **Register**: Gửi request POST `/api/v1/auth/register` với email, password, full_name
   - Nhận OTP qua email (Mailtrap)
   
2. **Verify Email**: Gửi POST `/api/v1/auth/verify-email` với email và OTP

3. **Login**: POST `/api/v1/auth/login` với email và password
   - Nhận JWT token trong response

4. **Get User Profile**: GET `/api/v1/user/profile` với header `Authorization: Bearer <token>`

5. **Update Profile**: PUT `/api/v1/user/profile` với thông tin cập nhật

6. **Forgot Password**: POST `/api/v1/auth/forgot-password` với email
   - Nhận OTP qua email

7. **Reset Password**: POST `/api/v1/auth/reset-password` với email, OTP, new_password

## Rate Limiting

- Register: 5 requests/phút
- Login: 5 requests/phút
- Forgot Password: 3 requests/phút

## Environment Variables

Xem file `.env.example` cho tất cả các biến môi trường cần thiết.

## Error Codes

- `400` - Validation error
- `401` - Unauthorized (no/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `429` - Too many requests
- `500` - Internal server error

## Notes

- Database sẽ tự động sync ( Sequelize `alter: true`). Trong production nên dùng migration.
- Email verification OTP valid trong 10 phút.
- JWT token expires sau 24h.
- Passwords được hash với bcrypt (salt rounds: 10).
- Rate limiting sử dụng memory store (phù hợp cho dev). Trong production nên dùng Redis.

## License

MIT
