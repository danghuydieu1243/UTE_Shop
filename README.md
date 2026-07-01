# UTE_Shop — Athena

Sàn thương mại điện tử e-book **Athena**. Monorepo gồm backend REST API và frontend SPA, xây dựng lại bằng TypeScript theo kiến trúc 3 tầng.

## Cấu trúc repo

```
UTE_Shop/
├── backend/     API Node.js/Express + TypeScript + Sequelize (MySQL)
├── frontend/    SPA React 18 + TypeScript + Vite + Redux Toolkit (RTK Query)
└── docs/        Tài liệu thiết kế/đặc tả (cục bộ, không commit)
```

- Chi tiết kiến trúc, quy ước, endpoint backend: [backend/README.md](backend/README.md)
- Chi tiết kiến trúc, quy ước, routes frontend: [frontend/README.md](frontend/README.md)

## Stack chính

| | Backend | Frontend |
|---|---|---|
| Ngôn ngữ | TypeScript | TypeScript |
| Framework | Express | React 18 + Vite |
| Data | Sequelize (MySQL), migrations | Redux Toolkit + RTK Query |
| Validate | Zod | React Hook Form + Zod |
| Auth | Access + refresh JWT (rotation), OTP, RBAC | Guards theo role, token tự refresh qua Axios interceptor |
| UI | — | Tailwind CSS (Design System token hoá) |
| Test | Jest + Supertest (sqlite in-memory) | Vitest + React Testing Library |

## Chạy nhanh

Yêu cầu: Node.js, MySQL đang chạy (cho backend `dev`; test dùng sqlite in-memory nên không cần MySQL).

**Backend** (`cd backend`):
```bash
npm install
cp .env.example .env      # điền DB_*, JWT_ACCESS_SECRET/JWT_REFRESH_SECRET (≥16 ký tự), SMTP_* (Mailtrap)
npm run migrate && npm run seed   # tạo schema + tài khoản admin/vendor mẫu (cần DB sạch)
npm run dev                # http://localhost:3000
npm test                    # Jest + Supertest, không cần MySQL
```

**Frontend** (`cd frontend`):
```bash
npm install
npm run dev                # http://localhost:5173, proxy /api -> :3000
npm run test                # Vitest + RTL
npm run lint                 # tsc --noEmit
npm run build
```

Không có package.json/công cụ workspace ở gốc — mọi lệnh chạy trong từng thư mục con.

## Frontend ↔ Backend

- Frontend gọi `/api/v1/*`; khi dev, Vite proxy `/api` sang backend `localhost:3000`.
- Backend trả envelope thống nhất `{success, data}` / `{success:false, error:{code, message}}`.
- JWT lưu ở phía client, access token tự gắn vào header; hết hạn sẽ tự refresh (rotation) hoặc đăng xuất nếu refresh fail.
- Role hiện có: `user` / `vendor` / `admin` / `manager`.

## License

MIT
