# 🐛 Bug Tracker

> **Last Updated**: 2026-04-07

## Open Bugs

| ID | Severity | Description | Found Date | Module | Repro Steps |
|----|----------|-------------|------------|--------|-------------|
| | | | | | |

---

## Fixed Bugs (sorted by date, newest first)

| ID | Severity | Description | Root Cause | Fix | Date |
|----|----------|-------------|------------|-----|------|
| BUG-005 | 🔴 HIGH | Tidak dapat membaca isi PDF | `pdfReader.js` pakai `new URL(..., import.meta.url)` untuk worker path — gagal resolve di Tauri webview karena protocol `tauri://` bukan `http://` | Ganti ke Vite `?url` import (`import workerUrl from '...?url'`), tambah `useSystemFonts: true` dan `isEvalSupported: false` ke semua `getDocument` calls | 2026-04-07 |
| BUG-004 | 🔴 HIGH | App crash saat launch — dialog plugin config error | `tauri.conf.json` punya `"dialog": {}` di plugins section, tapi plugin dialog v2 expect unit type bukan map | Hapus seluruh `plugins` section dari tauri.conf.json, config via capabilities saja | 2026-04-07 |
| BUG-003 | 🔴 HIGH | `cargo check` gagal — tokio crate not found | `openclaw.rs` pakai `tokio::time::sleep` tapi tokio tidak ada di Cargo.toml dependencies | Ganti dengan `std::thread::sleep` yang tidak butuh external dependency | 2026-04-07 |
| BUG-002 | 🔴 HIGH | Pindah tab lalu balik ke chat membuat obrolan baru | `useOpenClaw.setClearCallback` useEffect dipanggil saat `clearMessages` berubah, yang memicu `createSession()` setiap re-render | Hapus useEffect callback pattern, ganti dengan `handleClear` callback langsung di App.jsx | 2026-04-07 |
| BUG-001 | 🔴 HIGH | RAG embedding gagal di Tauri production | `rag.js` hardcoded `http://localhost:11434` — bypass Vite proxy, tidak bisa diakses di Tauri bundle | Ganti ke `getOllamaUrl()` dari centralized config yang proxy-aware | 2026-04-07 |

---

## Bug Severity Guide

| Severity | Impact | Response Time |
|----------|--------|---------------|
| 🔴 CRITICAL | System unusable, data loss | Fix immediately |
| 🔴 HIGH | Core feature broken | Fix within same session |
| 🟡 MED | Feature degraded but workaround exists | Fix when possible |
| 🟢 LOW | Cosmetic / minor UX issue | Schedule for next phase |
