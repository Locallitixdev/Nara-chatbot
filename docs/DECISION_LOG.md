# 📋 Decision Log

> **Last Updated**: 2026-04-07

Setiap keputusan arsitektur/desain dicatat di sini agar AI dan developer tahu **kenapa** sesuatu dibuat begitu.

| # | Tanggal | Keputusan | Alasan | Alternatif Ditolak |
|---|---------|-----------|--------|--------------------| 
| D-001 | 2026-04-07 | 100% local/offline, zero cloud dependency | Privacy-first untuk pasar Indonesia, data sensitif UMKM tidak boleh ke cloud | Firebase, Supabase, OpenAI API |
| D-002 | 2026-04-07 | React (JSX) + Vite untuk frontend | Ekosistem luas, familiar, cepat HMR. Tanpa TypeScript untuk simplicity | Next.js (overkill utk desktop), Svelte (less ecosystem) |
| D-003 | 2026-04-07 | Tauri v2 (Rust) sebagai desktop wrapper | Ukuran bundle jauh lebih kecil dari Electron (~10MB vs ~200MB), performa native | Electron (terlalu besar), neutralinojs (kurang mature) |
| D-004 | 2026-04-07 | Ollama sebagai LLM backend | API standar, support banyak model, easy model management, community besar | llama.cpp langsung (perlu manage sendiri), vLLM (overkill) |
| D-005 | 2026-04-07 | Qwen2.5-14B sebagai default model | Performa terbaik di ukuran ~8.9GB, multilingual termasuk Bahasa Indonesia | Llama3.1-8B (kurang multilingual), Mistral-7B (kurang BI) |
| D-006 | 2026-04-07 | Whisper.cpp untuk speech-to-text | C++ native = cepat, support model BI fine-tuned, bisa di-bundle | OpenAI Whisper Python (butuh Python runtime), browser Web Speech API (kurang akurat BI) |
| D-007 | 2026-04-07 | OpenClaw untuk AI agent/automation | Support WhatsApp, email, extensible | Langchain (Python-based), AutoGPT (terlalu kompleks) |
| D-008 | 2026-04-07 | CSS per-component (no Tailwind) | Full control, tidak ada dependency tambahan, bundle size minimal | Tailwind (utility-first tapi nambah complexity), CSS-in-JS (runtime overhead) |
| D-009 | 2026-04-07 | React hooks untuk state (no Redux) | App scope masih manageable dengan hooks, less boilerplate | Redux (overkill), Zustand (optional di masa depan jika scale) |
| D-010 | 2026-04-07 | In-memory vector store untuk RAG (fase awal) | Simple, cepat untuk prototype. Upgrade ke SQLite/hnswlib di production | Chroma (butuh Python), Pinecone (cloud, melanggar prinsip lokal) |
| D-011 | 2026-04-07 | Tauri v2 plugin config via capabilities saja, bukan tauri.conf.json plugins | Plugin dialog v2 tidak accept config map di tauri.conf.json (crash). Capabilities lebih granular dan sesuai Tauri v2 pattern | Config di tauri.conf.json plugins section (crash runtime) |
| D-012 | 2026-04-07 | `std::thread::sleep` di Rust bukan tambah tokio dependency | Hanya perlu 2s wait untuk OpenClaw startup. Tidak worth menambah crate dependency untuk satu use case | Tambah `tokio` ke Cargo.toml (unnecessary dependency bloat) |
| D-013 | 2026-04-07 | Vite `?url` import untuk worker files di Tauri | `new URL(..., import.meta.url)` gagal di Tauri karena protocol `tauri://`. Vite `?url` suffix resolve path saat build time | `new URL()` pattern (broken di Tauri), inline worker (larger bundle) |
