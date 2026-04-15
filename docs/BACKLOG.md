# 📥 Backlog — Feature Requests & Ideas

> **Last Updated**: 2026-04-07

## Prioritized Queue

| # | Tanggal | Request | Prioritas | Target Phase | Status |
|---|---------|---------|-----------|--------------|--------|
| B-001 | 2026-04-07 | Ollama streaming chat (end-to-end via Tauri) | 🔴 HIGH | Phase 1 | ✅ Done |
| B-002 | 2026-04-07 | Tauri Rust commands: ollama proxy, system info | 🔴 HIGH | Phase 1 | ✅ Done (Rust compiled, app launches) |
| B-003 | 2026-04-07 | Whisper.cpp voice input integration | 🔴 HIGH | Phase 2 | ✅ Done (compiled, needs whisper.cpp binary at runtime) |
| B-004 | 2026-04-07 | RAG document indexing via Tauri backend | 🔴 HIGH | Phase 3 | ✅ Done |
| B-005 | 2026-04-07 | System stats monitoring (CPU/RAM/NPU) | 🟡 MED | Phase 4 | ✅ Done |
| B-006 | 2026-04-07 | OpenClaw process manager (Rust) | 🟡 MED | Phase 5 | ✅ Done |
| B-007 | 2026-04-07 | WhatsApp automation via OpenClaw | 🟡 MED | Phase 5 | ✅ Done (UI + API scaffold) |
| B-008 | 2026-04-07 | Email automation via OpenClaw | 🟢 LOW | Phase 5 | ✅ Done (UI + API scaffold) |
| B-009 | 2026-04-07 | Dark mode + theme system | 🟡 MED | Phase 6 | ✅ Done |
| B-010 | 2026-04-07 | Production build & installer (deb/msi/dmg) | 🟡 MED | Phase 6 | 📋 Planned |
| B-011 | 2026-04-07 | Markdown rendering in chat (code blocks, tables) | 🟡 MED | Phase 1 | ✅ Done |
| B-012 | 2026-04-07 | VoiceButton component + push-to-talk UI | 🟡 MED | Phase 2 | ✅ Done |

## Mid-Session Additions (muncul saat kerja phase lain)

| # | Tanggal | Context | Request | Action Taken |
|---|---------|---------|---------|-------------|
| M-001 | 2026-04-07 | User test PDF di Tauri | PDF tidak bisa dibaca | Fixed: worker URL + getDocument options (BUG-005) |

## Parking Lot (ide jangka panjang, belum prioritas)

| # | Ide | Notes |
|---|-----|-------|
| P-001 | Multi-language LLM support (selain Qwen) | Bisa ganti model via Settings |
| P-002 | Plugin system untuk extensibility | User buat custom tools |
| P-003 | Offline-first sync (IndexedDB → SQLite) | Untuk data persistence |
| P-004 | Slack integration | Via OpenClaw interfaces |
| P-005 | Calendar/scheduler automation | Via OpenClaw tools |
| P-006 | DOCX & XLSX support di RAG | Pakai mammoth.js & SheetJS |
