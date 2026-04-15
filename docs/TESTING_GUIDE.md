# 🧪 Manual Testing Guide

> **Tujuan**: Panduan step-by-step untuk test seluruh platform.

---

## 📦 STEP 0: Setup & Jalankan

```bash
# Jalankan project
[command untuk start project]

# Health check
[command untuk cek project running]
```

---

## 🔑 Akun Login (jika ada)

| Role | Email | Password |
|------|-------|----------|
| Admin | | |
| User | | |

---

## 🧪 PART 1: [Nama Fitur]

| # | Step | Expected Result | ☐ |
|---|------|-----------------|---|
| 1.1 | [Langkah] | [Hasil yang diharapkan] | ☐ |
| 1.2 | [Langkah] | [Hasil yang diharapkan] | ☐ |

---

## 🐛 Format Laporan Bug

```
### BUG-[nomor]

**Severity**: 🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low
**Part**: [Part berapa dan step berapa]
**Module**: [Nama module]

**Steps to Reproduce**:
1. ...
2. ...

**Expected**: Apa yang seharusnya terjadi
**Actual**: Apa yang terjadi (error/salah)

**Screenshot**: [paste jika ada]
**Console Error**: [paste dari F12 jika ada]
```
