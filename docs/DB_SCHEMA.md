# 🗄️ Database Schema

> **Last Updated**: [tanggal]  
> **Database**: [PostgreSQL/MySQL/SQLite/MongoDB]  
> **ORM**: [Prisma/Drizzle/TypeORM/Sequelize]

---

## Tables

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| email | VARCHAR(255) UNIQUE | |
| password_hash | VARCHAR(255) | |
| created_at | TIMESTAMP | |

---

<!-- Tambah tabel lain sesuai kebutuhan -->
