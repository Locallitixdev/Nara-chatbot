# 📡 API Contracts

> **Last Updated**: [tanggal]  
> **Base URL**: `http://localhost:[port]/api`  
> **Auth**: Bearer token via `Authorization` header (except public endpoints)

---

## Auth (`/api/auth`)

| Method | Endpoint | Guard | Description |
|--------|----------|-------|-------------|
| POST | `/auth/login` | — | Login → { token, user } |
| POST | `/auth/register` | — | Register new user |
| GET | `/auth/me` | @Auth | Get current user profile |

---

<!-- Tambah module lain sesuai kebutuhan -->
