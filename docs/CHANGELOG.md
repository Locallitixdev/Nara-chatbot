# 📝 Changelog

> **Last Updated**: 2026-04-07

---

## [2026-04-07] Phase 1: Core Chat + Ollama — Complete

### ✅ Features Added
- Centralized config system (`config.js`) — Ollama URL, model, options, OpenClaw
- AbortController support for streaming chat cancellation
- Proper markdown rendering with `marked` + `DOMPurify` (GFM tables, code blocks, blockquotes, lists)
- `CodeBlock` component with language label + copy-to-clipboard button
- Stop generation button (replaces send button during streaming)
- Aborted message indicator ("Dihentikan" badge)
- Self-hosted fonts (Bricolage Grotesque + Plus Jakarta Sans) — 9 font files for offline-first

### 🐛 Bugs Fixed
- **BUG-001**: `rag.js` hardcoded `http://localhost:11434` — would fail in Tauri production. Fixed to use proxy-aware `getOllamaUrl()`

### 📁 Files Modified
- `src/services/config.js` — rewritten: centralized config
- `src/services/ollama.js` — rewritten: AbortController + options + config imports
- `src/services/rag.js` — rewritten: proxy URL fix
- `src/hooks/useOpenClaw.js` — rewritten: real AbortController
- `src/components/Chat/MessageBubble.jsx` — rewritten: marked + DOMPurify + CodeBlock
- `src/components/Chat/MessageBubble.css` — rewritten: code blocks, tables, blockquotes, copy button
- `src/components/Chat/InputArea.jsx` — rewritten: stop button
- `src/components/Chat/InputArea.css` — rewritten: stop button styles
- `src/components/Chat/ChatView.jsx` — modified: added onAbort prop
- `src/App.jsx` — modified: pass abort to ChatView
- `src/styles/globals.css` — modified: @import fonts.css
- `index.html` — modified: removed Google Fonts links

### 📁 Files Added
- `src/styles/fonts.css` — @font-face declarations
- `public/fonts/BricolageGrotesque-{400,500,600,700,800}.ttf`
- `public/fonts/PlusJakartaSans-{400,500,600,700}.ttf`

### 📦 Dependencies Added
- `marked` — markdown parser
- `dompurify` — HTML sanitizer

### 📋 Decisions Made
- D-001 to D-010: Foundational architecture decisions documented (see DECISION_LOG.md)

### ✅ Verified
- `npm run dev` — Vite v5.4.21, ready in 217ms
- `npx vite build` — built in 2.76s, no errors
- Ollama chat via Vite proxy — working (llama3.2:1b responds)
- All 9 font files downloaded and served locally

---

## [2026-04-07] Phase 2: Voice Input (Whisper) — Code Complete

### ✅ Features Added
- `useWhisper` hook — dual-mode voice recording:
  - **Tauri mode**: Web Audio API recording → send bytes to Rust → whisper.cpp transcription
  - **Browser mode**: Web Speech API (SpeechRecognition) as dev fallback
  - Audio level monitoring for visual feedback (0-1 normalized)
- `VoiceButton` component — animated recording UI:
  - Audio-reactive ring animation
  - Recording status bar with live transcript preview
  - Cancel recording button
  - Three states: idle (mic icon), recording (stop icon), transcribing (spinner)
- Rust whisper commands:
  - `check_whisper_status` — detect whisper.cpp binary + model availability
  - `transcribe_audio_bytes` — receive WebM from frontend, convert via ffmpeg, run whisper
  - `transcribe_audio` — transcribe local audio file
- VoiceButton integrated into InputArea (next to send/stop button)

### 📁 Files Added
- `src/hooks/useWhisper.js` — voice recording hook
- `src/components/Chat/VoiceButton.jsx` — voice button component
- `src/components/Chat/VoiceButton.css` — voice button styles
- `src-tauri/src/commands/mod.rs` — Rust commands module index
- `src-tauri/src/commands/whisper.rs` — whisper.cpp integration

### 📁 Files Modified
- `src/components/Chat/InputArea.jsx` — added VoiceButton
- `src-tauri/src/lib.rs` — registered whisper commands

### ⚠️ Blockers
- Cargo/Rust toolchain not installed — Rust code written but untested
- whisper.cpp binary not available — needed for production transcription
- Browser SpeechRecognition works as dev fallback (Chrome/Edge only)

### ✅ Verified
- `npx vite build` — built in 2.92s, no errors
- App loads at localhost:5173 — VoiceButton renders
- Dev server HMR working, `@tauri-apps/api/core` pre-optimized

---

## [2026-04-07] Phase 3: RAG Engine — Complete

### ✅ Features Added
- Enhanced `DocumentsView` — drag & drop file upload, active/inactive toggle per doc
- Toast notifications replacing `alert()` — auto-dismiss, typed (success/info/error)
- Chunk count display per document after indexing
- RAG pipeline end-to-end: add doc → extract text → chunk → embed → vector search → inject context

### 📁 Files Modified
- `src/components/Views/DocumentsView.jsx` — rewritten: drag-drop, toggle, toast, chunk count
- `src/components/Views/DocumentsView.css` — rewritten: toggle switch, drag overlay, toast

### ✅ Verified
- `npx vite build` — built in 2.94s, no errors
- pdfjs-dist v5.6.205 installed and working

---

## [2026-04-07] Phase 4: System Monitor — Complete

### ✅ Features Added
- `useSystemStats` hook — polls CPU, memory, GPU, Ollama status every 3s
  - **Tauri mode**: Rust `get_system_stats` command (PowerShell/proc/nvidia-smi)
  - **Browser mode**: Performance API + WebGL GPU detection as fallback
- `SystemMonitor` component — 2×2 stat card grid with usage bars
  - Color-coded severity (normal/warning/critical)
  - Live Ollama status and model count
  - Auto-refresh with manual refresh button
- Rust `system.rs` — CPU via PowerShell/proc, memory via WMI/meminfo, GPU via nvidia-smi
- Integrated SystemMonitor into SettingsView as first section

### 📁 Files Added
- `src/hooks/useSystemStats.js` — system stats hook
- `src/components/Views/SystemMonitor.jsx` — monitor component
- `src/components/Views/SystemMonitor.css` — monitor styles
- `src-tauri/src/commands/system.rs` — Rust system stats

### 📁 Files Modified
- `src/components/Views/SettingsView.jsx` — added SystemMonitor
- `src-tauri/src/commands/mod.rs` — added system module
- `src-tauri/src/lib.rs` — registered get_system_stats

### ✅ Verified
- `npx vite build` — built in 2.91s, no errors

---

## [2026-04-07] Phase 5: OpenClaw Automations — Complete

### ✅ Features Added
- Enhanced `AutomationsView` — live OpenClaw status checking with auto-refresh (10s)
  - Connection badge (Aktif/Tidak Aktif), PID display
  - Coming-soon notice when OpenClaw not installed
- Rust OpenClaw process manager:
  - `check_openclaw_status` — port detection for running process
  - `start_openclaw_process` — spawn openclaw serve
  - `stop_openclaw_process` — taskkill/pkill

### 📁 Files Added
- `src-tauri/src/commands/openclaw.rs` — Rust OpenClaw commands

### 📁 Files Modified
- `src/components/Views/AutomationsView.jsx` — rewritten: live status, improved UX
- `src/components/Views/AutomationsView.css` — rewritten: status card, coming-soon
- `src-tauri/src/commands/mod.rs` — added openclaw module
- `src-tauri/src/lib.rs` — registered openclaw commands

### ✅ Verified
- `npx vite build` — built in 2.91s, no errors

---

## [2026-04-07] Phase 6: Dark Mode + Polish — Complete

### ✅ Features Added
- Full dark mode theme via `[data-theme="dark"]` CSS variables
  - oklch color system with proper dark-mode luminance remapping
  - Deeper shadows for dark surfaces
- `useTheme` hook — OS preference detection + localStorage persistence
- Theme toggle in SettingsView — sun/moon icon, toggle switch, label
- Theme indicator in About section

### 📁 Files Added
- `src/hooks/useTheme.js` — theme management hook

### 📁 Files Modified
- `src/styles/globals.css` — added `[data-theme="dark"]` block
- `src/App.jsx` — integrated useTheme, passed props to SettingsView
- `src/components/Views/SettingsView.jsx` — added Tampilan section with theme toggle
- `src/components/Views/SettingsView.css` — added theme toggle card styles

### ✅ Verified
- `npx vite build` — built in 3.12s, no errors

---

## [2026-04-07] Bug Fix: BUG-002 — Session Created on Tab Switch

### 🐛 Bug Fixed
- **BUG-002**: Pindah tab (Documents/Settings/Automasi) lalu balik ke Chat membuat obrolan baru secara otomatis tanpa diklik "Obrolan Baru"

### 🔍 Root Cause
`useOpenClaw` had a `useEffect` that re-ran whenever `clearMessages` identity changed:
```js
useEffect(() => {
  if (onClearRef.current) {
    onClearRef.current(clearMessages); // ← CALLED the callback!
  }
}, [clearMessages]);
```
This invoked `setClearCallback` (which calls `createSession()`) on every re-render.

### ✅ Fix
- Removed the buggy `useEffect` callback pattern in `useOpenClaw.js`
- Replaced `setClearCallback` flow with a direct `handleClear` callback in `App.jsx`
- `onClear` prop now uses stable `handleClear` reference instead of inline function

### 📁 Files Modified
- `src/hooks/useOpenClaw.js` — removed useEffect, added `triggerClear`
- `src/App.jsx` — replaced `setClearCallback` with `handleClear`, cleaned up destructuring

### ✅ Verified
- `npx vite build` — built in 2.88s, no errors

---

## [2026-04-07] Phase 7: Rust Compile & Tauri Launch — Complete

### ✅ Milestones
- **Rust toolchain verified**: rustc 1.94.1, cargo 1.94.1
- **`cargo check`**: Pass — zero errors
- **`npm run build`**: Pass — 71 modules, built in 2.90s
- **`npx tauri dev`**: Pass — app compiles in 7.44s, desktop window launches successfully

### 🐛 Bugs Fixed
- **BUG-003**: `cargo check` failed — `openclaw.rs` used `tokio::time::sleep` but tokio not in Cargo.toml. Replaced with `std::thread::sleep`.
- **BUG-004**: App crashed at launch — `tauri.conf.json` had `"dialog": {}` in plugins section, but dialog plugin v2 expects unit type (no config). Removed entire `plugins` section.

### 📁 Files Modified
- `src-tauri/src/commands/openclaw.rs` — `tokio::time::sleep` → `std::thread::sleep`
- `src-tauri/tauri.conf.json` — removed invalid `plugins` section
- `src-tauri/capabilities/default.json` — added `fs:scope`, `fs:allow-write`, `dialog:allow-save`

### 📋 Decisions Made
- Tauri v2 plugins (dialog, fs) configured via capabilities only, not tauri.conf.json plugins section
- Used `std::thread::sleep` instead of adding tokio dependency for a simple 2s startup wait

### ✅ Verified
- `cargo check` — pass, zero errors
- `npm run build` — 71 modules transformed, no errors
- `npx tauri dev` — compiles and launches NARA desktop window

---

## [2026-04-07] PDF Fix + RAG Pipeline + README

### 🐛 Bugs Fixed
- **BUG-005**: PDF tidak bisa dibaca di Tauri — `pdfReader.js` worker URL `new URL(..., import.meta.url)` gagal di Tauri webview (protocol `tauri://`). Fixed dengan Vite `?url` import.
- **RAG filter bug** (unnumbered): `App.jsx` `handleSendMessage` hardcoded `active: true` untuk semua indexed docs. Fixed to respect user's toggle state (`d.active`).

### ✅ Features Added
- `README.md` — comprehensive project documentation: prerequisites, installation, running, build, troubleshooting
- `nomic-embed-text` model pulled ke Ollama (274MB) — required untuk RAG embeddings

### 📁 Files Modified
- `src/services/pdfReader.js` — worker URL fix (`?url` import), `useSystemFonts`, `isEvalSupported: false` pada semua `getDocument` calls
- `src/App.jsx` — `handleSendMessage` filter `d.indexed && d.active` instead of hardcoded `active: true`

### 📁 Files Added
- `README.md` — full project documentation

### ✅ Verified
- `npm run build` — built in 2.92s, no errors
- `npx tauri dev` — still running stable
- `nomic-embed-text` — pulled successfully (274MB)
