# CLAUDE.md - Backend

Hướng dẫn cho Claude Code khi làm việc với backend UTEShop.

## Project Context

Backend API cho UTEShop e-commerce platform sử dụng Express.js, Sequelize ORM, MySQL. Kiến trúc 3 tầng rõ ràng.

### Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL
- **ORM**: Sequelize
- **Authentication**: JWT (jsonwebtoken)
- **Email**: Nodemailer
- **Validation**: express-validator
- **Security**: helmet, bcrypt
- **Rate Limiting**: express-rate-limit

### Architecture
- **3-Tier Architecture**:
  - Presentation: Routes + Controllers
  - Business: Services
  - Data Access: Repositories + Models

### Key Conventions
- API versioning: `/api/v1/...`
- Unified response format: `{success, message, data}`
- JWT Bearer token: `Authorization: Bearer <token>`
- Role-based routes: `/user/*` (user, admin), `/admin/*` (admin only)
- All timestamps: snake_case (`created_at`, `updated_at`)
- Comments: English (code), Vietnamese (nếu giải thích phức tạp)

## Development Workflow

### Branch Strategy
- Main branch: `main`
- Feature branches: `feature/feature-name`
- Task branches: `baitapXX` cho bài tập cụ thể

### Commits
Follow conventional commits:
- `feat: add user registration`
- `fix: resolve login validation bug`
- `docs: update API documentation`

### Testing
- Postman collection: `tests/auth-api-tests.json`
- Import vào Postman để test toàn bộ API
- Test flow: register → verify → login → profile

## File Structure

```
src/
├── config/           # Configuration (database, email, jwt)
├── controllers/      # Request/response handling
├── middleware/       # auth, validation, rate limiting
├── models/           # Sequelize models
├── repositories/     # Data access layer
├── routes/           # API routes
├── services/         # Business logic
├── utils/            # Helpers
└── app.js            # Express app setup
```

## Database

### Tables
1. `users`: id, email, password, full_name, phone, role, is_verified, verification_token, token_expires, created_at, updated_at
2. `password_reset_tokens`: id, user_id, token, expires_at, created_at

### Sequelize
- Auto-sync với `sequelize.sync({ alter: true })` trong development
- Trong production nên dùng migrations

## Important Notes

- **Password hashing**: bcrypt với salt rounds 10
- **JWT secret**: Phải đặt trong `.env`, không commit vào git
- **OTP**: 6-digit, valid 10 phút
- **Email**: Dùng Mailtrap cho test, config trong `.env`
- **Rate limiting**: Memory store (development only)

## Common Tasks

### Thêm endpoint mới
1. Tạo route trong `src/routes/*.routes.js`
2. Tạo controller method trong `src/controllers/*.controller.js`
3. Tạo service method trong `src/services/*.service.js` (nếu cần business logic)
4. Thêm validation trong `src/middleware/validation.js`
5. Apply middleware (auth, rate limiting) trong route definition

### Thêm model mới
1. Tạo file trong `src/models/`
2. Export từ `src/models/index.js`
3. Tạo repository trong `src/repositories/` (nếu cần)

### Debugging
- Check logs trong console
- Verify database connection
- Test với Postman collection
- Kiểm tra middleware chain

## Environment Setup Checklist

- [ ] `.env` file configured
- [ ] MySQL database created
- [ ] SMTP credentials (Mailtrap hoặc khác)
- [ ] JWT_SECRET set
- [ ] Database connection successful
- [ ] Tables created (sequelize sync)

## Testing Checklist

- [ ] Register với valid data
- [ ] Register với duplicate email
- [ ] Verify email
- [ ] Login với valid credentials
- [ ] Login với unverified email
- [ ] Access protected routes without token
- [ ] Access admin routes with user role
- [ ] Update profile
- [ ] Forgot password flow
- [ ] Reset password flow
- [ ] Rate limiting test

---

Last updated: 2025-02-17
