# 🤖 NARA — AI Assistant Lokal untuk Indonesia

> **100% offline, zero cloud, privacy-first.**  
> Dibangun dengan React + Tauri (Rust) + Ollama + Whisper.cpp

![Version](https://img.shields.io/badge/version-1.0.0--beta-blue)
![Platform](https://img.shields.io/badge/platform-Windows%20|%20Linux%20|%20macOS-lightgrey)
![License](https://img.shields.io/badge/license-Private-red)

---

## 📋 Daftar Isi

- [Fitur](#-fitur)
- [Arsitektur](#-arsitektur)
- [Prerequisites](#-prerequisites)
- [Instalasi](#-instalasi)
- [Menjalankan Aplikasi](#-menjalankan-aplikasi)
- [Environment Variables](#-environment-variables)
- [Struktur Folder](#-struktur-folder)
- [Build Production](#-build-production)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Fitur

| Fitur | Deskripsi |
|-------|-----------|
| 💬 **Chat AI Lokal** | Streaming chat dengan LLM lokal via Ollama (Qwen2.5, Llama3, Mistral) |
| 🎙️ **Voice Input** | Speech-to-text via Whisper.cpp — mendukung Bahasa Indonesia |
| 📄 **RAG Engine** | Upload dokumen (PDF/TXT) → tanya jawab berbasis dokumen |
| 📊 **System Monitor** | Pantau CPU, RAM, GPU secara realtime |
| 🤖 **Automations** | WhatsApp & Email automation via OpenClaw |
| 🌙 **Dark Mode** | Theme gelap/terang dengan deteksi OS |
| ✍️ **Markdown** | Render markdown di chat (code blocks, tabel, list) |

---

## 🏗️ Arsitektur

```
┌─────────────────────────────────────────────────┐
│              NARA APP (Tauri v2)                 │
│                                                  │
│  ┌──────────────┐     ┌──────────────────────┐  │
│  │ Frontend     │     │  Rust Backend         │  │
│  │ React + Vite │◄───►│  • System monitor     │  │
│  │              │     │  • File I/O            │  │
│  │ • Chat UI    │     │  • Whisper runner      │  │
│  │ • RAG Panel  │     │  • OpenClaw manager    │  │
│  │ • Settings   │     │                        │  │
│  └──────┬───────┘     └──────────┬─────────────┘  │
└─────────┼────────────────────────┼────────────────┘
          │                        │
   ┌──────▼──────┐          ┌──────▼──────┐
   │   Ollama    │          │  Whisper    │
   │  :11434     │          │  .cpp       │
   │ Qwen2.5-14B │          │ (ASR lokal) │
   └─────────────┘          └─────────────┘
```

---

## 📦 Prerequisites

Pastikan semua tool berikut sudah terinstall di sistem kamu:

### Wajib

| Tool | Versi Minimum | Cek Instalasi | Install |
|------|--------------|---------------|---------|
| **Node.js** | v18+ | `node --version` | [nodejs.org](https://nodejs.org/) |
| **npm** | v9+ | `npm --version` | Bundled dengan Node.js |
| **Rust** | v1.77+ | `rustc --version` | [rustup.rs](https://rustup.rs/) |
| **Cargo** | v1.77+ | `cargo --version` | Bundled dengan Rust |
| **Ollama** | Latest | `ollama --version` | [ollama.com](https://ollama.com/download) |

### Opsional (untuk fitur tambahan)

| Tool | Untuk Fitur | Install |
|------|-------------|---------|
| **ffmpeg** | Voice input (konversi audio) | `winget install ffmpeg` atau [ffmpeg.org](https://ffmpeg.org/) |
| **whisper.cpp** | Voice transcription | [github.com/ggerganov/whisper.cpp](https://github.com/ggerganov/whisper.cpp) |
| **OpenClaw** | WhatsApp/Email automation | Lihat dokumentasi OpenClaw |

### Windows Specific

Untuk build Tauri di Windows, kamu juga perlu:
- **Microsoft Visual Studio C++ Build Tools** — install via [Visual Studio Installer](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- **WebView2** — biasanya sudah pre-installed di Windows 10/11

---

## 🚀 Instalasi

### 1. Clone Repository

```bash
git clone <repository-url>
cd "01. AI Chat bot"
```

### 2. Install Dependencies (Frontend)

```bash
npm install
```

### 3. Install Rust Dependencies (otomatis saat pertama kali build)

```bash
cd src-tauri
cargo check    # download & compile Rust dependencies
cd ..
```

### 4. Setup Ollama

```bash
# Download & jalankan Ollama
ollama serve

# Di terminal baru, download model AI
ollama pull qwen2.5:14b        # ~8.9 GB — recommended, multilingual
# ATAU model lebih ringan:
ollama pull llama3.2:1b         # ~1.3 GB — paling ringan
ollama pull qwen2.5:7b          # ~4.7 GB — medium
ollama pull llama3.1:8b         # ~4.7 GB — alternatif
```

### 5. Setup Environment

```bash
# Copy contoh env dan sesuaikan
cp .env.example .env
```

Edit file `.env`:

```env
VITE_OLLAMA_URL=http://localhost:11434
VITE_OLLAMA_MODEL=qwen2.5:14b
```

---

## ▶️ Menjalankan Aplikasi

### Mode Development (dengan hot-reload)

```bash
# Pastikan Ollama sudah berjalan di terminal lain:
ollama serve

# Jalankan NARA:
npx tauri dev
```

Ini akan:
1. ✅ Start Vite dev server di `http://localhost:5173`
2. ✅ Compile Rust backend
3. ✅ Buka window desktop NARA

> **Pertama kali** compile Rust bisa memakan waktu **3-5 menit** (download + compile ~411 crates).  
> Setelahnya hanya **~7 detik** untuk incremental build.

### Mode Browser Only (tanpa Tauri)

Jika hanya ingin develop frontend tanpa desktop wrapper:

```bash
npm run dev
```

Buka `http://localhost:5173` di browser. Chat tetap berfungsi via Vite proxy ke Ollama.

> ⚠️ Voice input dan System Monitor **tidak tersedia** di mode browser (butuh Tauri backend).

---

## ⚙️ Environment Variables

| Variable | Default | Keterangan |
|----------|---------|------------|
| `VITE_OLLAMA_URL` | `http://localhost:11434` | URL Ollama server |
| `VITE_OLLAMA_MODEL` | `qwen2.5:14b` | Model AI default |
| `VITE_OPENCLAW_URL` | `http://localhost:7654` | URL OpenClaw gateway |
| `VITE_OPENCLAW_TOKEN` | _(kosong)_ | Token auth OpenClaw |
| `VITE_APP_NAME` | `NARA AI Assistant` | Nama aplikasi |
| `VITE_APP_VERSION` | `1.0.0` | Versi aplikasi |

---

## 📁 Struktur Folder

```
nara-app/
├── src/                          # React frontend
│   ├── App.jsx                   # Komponen utama
│   ├── main.jsx                  # Entry point React
│   ├── components/
│   │   ├── Chat/                 # Chat UI components
│   │   ├── Panels/               # Sidebar & panels
│   │   ├── Views/                # Documents, Automations, Settings
│   │   └── Onboarding/          # First-time setup wizard
│   ├── hooks/                    # Custom React hooks
│   │   ├── useOllama.js          # Ollama streaming
│   │   ├── useWhisper.js         # Voice recording
│   │   ├── useSystemStats.js     # Hardware monitoring
│   │   └── useTheme.js           # Dark/light mode
│   ├── services/                 # API clients
│   │   ├── ollama.js             # Ollama API
│   │   ├── rag.js                # RAG engine
│   │   └── openclaw.js           # OpenClaw API
│   └── styles/                   # Global CSS
│
├── src-tauri/                    # Rust backend (Tauri v2)
│   ├── src/
│   │   ├── lib.rs                # Plugin registration & commands
│   │   ├── main.rs               # Entry point
│   │   └── commands/
│   │       ├── whisper.rs         # Speech-to-text
│   │       ├── system.rs          # CPU/RAM/GPU stats
│   │       └── openclaw.rs        # Process manager
│   ├── Cargo.toml                # Rust dependencies
│   ├── tauri.conf.json           # Tauri configuration
│   └── capabilities/             # Permission capabilities
│
├── docs/                         # Project documentation
├── public/                       # Static assets & fonts
├── package.json                  # Node.js dependencies
├── vite.config.js                # Vite configuration
└── .env                          # Environment variables
```

---

## 📦 Build Production

### Build Installer (Windows .msi)

```bash
npx tauri build
```

Output installer ada di:
```
src-tauri/target/release/bundle/msi/NARA_0.1.0_x64.msi
```

### Build untuk Platform Lain

| Platform | Command | Output |
|----------|---------|--------|
| Windows | `npx tauri build` | `.msi` installer |
| Linux | `npx tauri build` | `.deb`, `.AppImage` |
| macOS | `npx tauri build` | `.dmg` |

> ⚠️ Build harus dilakukan di platform yang sesuai (tidak bisa cross-compile).

---

## 🔧 Troubleshooting

### "Ollama connection refused"

```bash
# Pastikan Ollama berjalan:
ollama serve

# Test koneksi:
curl http://localhost:11434/api/tags
```

### "cargo: command not found"

Install Rust toolchain:
```bash
# Windows (PowerShell):
winget install Rustlang.Rustup

# Linux/macOS:
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Restart terminal setelah install.

### Build Rust lambat (pertama kali)

Normal! Pertama kali compile ~411 crates membutuhkan 3-5 menit. Setelahnya incremental build hanya beberapa detik.

### "WebView2 not found" (Windows)

Download WebView2 Runtime dari [Microsoft](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

### Port 5173 sudah digunakan

```bash
# Cek proses yang menggunakan port:
netstat -ano | findstr :5173

# Kill proses tersebut atau ubah port di vite.config.js
```

### Voice input tidak berfungsi

1. Pastikan `ffmpeg` terinstall: `ffmpeg -version`
2. Pastikan `whisper.cpp` binary tersedia
3. Download model whisper: `bash whisper.cpp/models/download-ggml-model.sh medium`

---

## 📝 Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | React 18 + Vite 5 |
| **Desktop** | Tauri v2 (Rust) |
| **LLM** | Ollama (Qwen2.5 / Llama3 / Mistral) |
| **Voice** | Whisper.cpp |
| **Automation** | OpenClaw |
| **Styling** | CSS per-component (no Tailwind) |
| **State** | React Hooks (no Redux) |
| **Markdown** | marked + DOMPurify |
| **PDF** | pdfjs-dist |

---

<p align="center">
  <b>NARA</b> — Dibuat dengan ❤️ untuk Indonesia 🇮🇩
</p>
