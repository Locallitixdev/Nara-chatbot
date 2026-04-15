# NARA AI Assistant — Dokumentasi Teknis Lengkap

> **Versi:** 1.0.0-beta  
> **Stack:** React (JSX) → Tauri (Rust) → Ollama → Whisper.cpp → OpenClaw  
> **Filosofi:** 100% lokal, zero cloud, privacy-first untuk pasar Indonesia


## Daftar Isi

1. [Arsitektur Sistem Overview](#1-arsitektur-sistem-overview)
2. [Flow Code Frontend (React JSX)](#2-flow-code-frontend-react-jsx)
3. [Struktur Folder Proyek](#3-struktur-folder-proyek)
4. [Integrasi Ollama (Local LLM API)](#4-integrasi-ollama-local-llm-api)
5. [Integrasi Whisper (Speech-to-Text)](#5-integrasi-whisper-speech-to-text)
6. [Integrasi OpenClaw (AI Agent)](#6-integrasi-openclaw-ai-agent)
7. [Membungkus ke Tauri (Rust)](#7-membungkus-ke-tauri-rust)
8. [RAG Engine Implementation](#8-rag-engine-implementation)
9. [Environment Setup & Checklist](#9-environment-setup--checklist)

---

## 1. Arsitektur Sistem Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    NARA APP (Tauri)                          │
│                                                             │
│  ┌─────────────────┐     ┌─────────────────────────────┐   │
│  │  Frontend (React)│     │     Rust Backend (Tauri)     │   │
│  │                 │     │                             │   │
│  │  • Chat UI      │◄───►│  • System info              │   │
│  │  • RAG Panel    │     │  • File I/O                 │   │
│  │  • Settings     │     │  • Process manager          │   │
│  │  • Automations  │     │  • Whisper runner           │   │
│  └────────┬────────┘     └──────────┬──────────────────┘   │
│           │                         │                       │
└───────────┼─────────────────────────┼───────────────────────┘
            │                         │
     ┌──────▼──────┐           ┌──────▼──────┐
     │   Ollama    │           │  Whisper    │
     │  :11434     │           │  .cpp       │
     │             │           │             │
     │ Qwen2.5-14B │           │ model.bin   │
     │ Llama3.1-8B │           │ (ASR lokal) │
     └─────────────┘           └─────────────┘
            │
     ┌──────▼──────┐
     │  OpenClaw   │
     │  Agent      │
     │             │
     │ WhatsApp    │
     │ Email       │
     │ Automation  │
     └─────────────┘
```

### Alur Data Utama

```
User Input (teks/suara)
       │
       ▼
[Whisper.cpp] ←── jika input suara
       │
       ▼
[React UI] → kirim ke [Ollama API :11434]
       │              │
       │         [Model LLM lokal]
       │              │
       │         [RAG Engine] ← dokumen terindeks
       │              │
       ◄──────────────┘
       │
[Render respons di UI]
       │
[OpenClaw] ← jika ada trigger automation
```

---

## 2. Flow Code Frontend (React JSX)

### 2.1 State Management

```jsx
// State utama aplikasi — semua di React hooks, tidak ada Redux
const [messages, setMessages]       = useState([]);   // riwayat chat
const [inputVal, setInputVal]       = useState("");   // teks di input box
const [isLoading, setIsLoading]     = useState(false);// status loading AI
const [isRecording, setIsRecording] = useState(false);// status rekam suara
const [docs, setDocs]               = useState(DOCS); // daftar dokumen RAG
const [activeNav, setActiveNav]     = useState("chat");// tab aktif
const [ragChips, setRagChips]       = useState([]);   // file yg di-attach ke chat
const [selectedModel, setSelectedModel] = useState("qwen2.5:14b");
```

### 2.2 Flow Kirim Pesan

```
User ketik teks / klik send
         │
         ▼
sendMessage(text)
         │
         ├── validasi: kosong? loading? → return
         │
         ├── setMessages([...messages, userMsg])   // tambah ke UI
         │
         ├── setIsLoading(true)                    // tampilkan typing indicator
         │
         ├── bangun ragContext dari docs yang aktif
         │
         ├── callOllama(messages, ragContext)       // ← API call ke Ollama
         │          │
         │          ├── POST http://localhost:11434/api/chat
         │          └── stream token satu per satu (SSE)
         │
         ├── setMessages([...messages, assistantMsg]) // tambah respons
         │
         └── setIsLoading(false)
```

### 2.3 Komponen Utama dan Tugasnya

| Komponen | Lokasi | Tugas |
|---|---|---|
| `NaraApp` | Root | State global, routing antar view |
| `OnboardingOverlay` | Modal | Wizard setup pertama kali (3 step) |
| `ChatView` | Main area | Render pesan, input box, quick actions |
| `DocumentsView` | Main area | Upload & manage dokumen RAG |
| `AutomationsView` | Main area | Toggle on/off automation tasks |
| `SettingsView` | Main area | Ganti model, privasi, integrasi |
| `SystemStats` | Right panel | Monitor CPU/RAM/NPU realtime |
| `RightPanel` | Right panel | Stats + model info + integrasi |

### 2.4 Lifecycle Onboarding

```jsx
// 3 step: welcome → setup (loading) → done
const [step, setStep] = useState(0);

// Step 1 → 2: mulai loading simulasi
useEffect(() => {
  if (step !== 1) return;
  let i = 0;
  const timer = setInterval(() => {
    i++;
    setSetupProgress(i);
    if (i >= ONBOARDING_STEPS.length) {
      clearInterval(timer);
      setTimeout(() => setStep(2), 600); // delay kecil sebelum "done"
    }
  }, 900); // tiap 900ms satu step selesai
  return () => clearInterval(timer);
}, [step]);
```

### 2.5 RAG Context Builder

```jsx
// Sebelum kirim ke AI, bangun context dari dokumen aktif
const buildRagContext = (docs) => {
  const activeDocs = docs.filter(d => d.active);
  if (activeDocs.length === 0) return null;

  return `
[DOKUMEN AKTIF DI SISTEM RAG]
${activeDocs.map(d => `- ${d.name} (${d.chunks} chunks terindeks)`).join("\n")}

Gunakan informasi dari dokumen-dokumen ini jika relevan dengan pertanyaan pengguna.
Selalu sebutkan sumber dokumen ketika mengutip informasi spesifik.
  `.trim();
};
```

---

## 3. Struktur Folder Proyek

```
nara-app/
├── src-tauri/                    ← Rust backend
│   ├── src/
│   │   ├── main.rs               ← Entry point Tauri
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── ollama.rs         ← Proxy ke Ollama API
│   │   │   ├── whisper.rs        ← Jalankan whisper.cpp
│   │   │   ├── rag.rs            ← Indexing dokumen lokal
│   │   │   ├── system.rs         ← CPU/RAM/NPU monitoring
│   │   │   └── openclaw.rs       ← Manage OpenClaw process
│   │   └── lib.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/                          ← React frontend
│   ├── main.jsx                  ← React entry
│   ├── App.jsx                   ← NaraApp komponen utama
│   ├── components/
│   │   ├── Chat/
│   │   │   ├── ChatView.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   ├── InputArea.jsx
│   │   │   └── QuickActions.jsx
│   │   ├── Panels/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── LeftPanel.jsx
│   │   │   └── RightPanel.jsx
│   │   ├── Views/
│   │   │   ├── DocumentsView.jsx
│   │   │   ├── AutomationsView.jsx
│   │   │   └── SettingsView.jsx
│   │   └── Onboarding/
│   │       └── OnboardingOverlay.jsx
│   ├── hooks/
│   │   ├── useOllama.js          ← Custom hook untuk Ollama API
│   │   ├── useWhisper.js         ← Custom hook untuk voice recording
│   │   ├── useRAG.js             ← Custom hook untuk dokumen
│   │   └── useSystemStats.js     ← Custom hook untuk monitor hardware
│   ├── services/
│   │   ├── ollama.js             ← API client Ollama
│   │   ├── whisper.js            ← Interface ke Whisper via Tauri
│   │   ├── openclaw.js           ← Interface ke OpenClaw via Tauri
│   │   └── rag.js                ← RAG engine (chunking + embedding)
│   ├── store/
│   │   └── index.js              ← Zustand global state (opsional)
│   └── styles/
│       └── globals.css
│
├── models/                       ← Model files (gitignored)
│   ├── whisper-medium-id.bin     ← Model Whisper Bahasa Indonesia
│   └── .gitkeep
│
├── scripts/
│   ├── download-models.sh        ← Script download Ollama models
│   ├── setup-openclaw.sh         ← Setup OpenClaw
│   └── check-deps.sh             ← Cek semua dependensi
│
├── package.json
├── vite.config.js
└── README.md
```

---

## 4. Integrasi Ollama (Local LLM API)

### 4.1 Install Ollama

```bash
# Linux / macOS
curl -fsSL https://ollama.com/install.sh | sh

# Windows
# Download installer dari https://ollama.com/download/windows

# Verifikasi
ollama --version

# Download model default NARA
ollama pull qwen2.5:14b        # ~8.9 GB — default NARA
ollama pull qwen2.5:7b         # ~4.7 GB — mode hemat
ollama pull llama3.1:8b        # ~4.7 GB — alternatif
ollama pull mistral:7b         # ~4.1 GB — cepat

# Jalankan Ollama server (otomatis di background)
ollama serve
# Server berjalan di: http://localhost:11434
```

### 4.2 Ollama API Client (JavaScript)

```javascript
// src/services/ollama.js

const OLLAMA_BASE = "http://localhost:11434";

// ─── Health Check ─────────────────────────────────────────────
export async function checkOllamaHealth() {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`);
    const data = await res.json();
    return {
      running: true,
      models: data.models.map(m => m.name),
    };
  } catch (e) {
    return { running: false, models: [] };
  }
}

// ─── List Models yang Tersedia ────────────────────────────────
export async function listModels() {
  const res = await fetch(`${OLLAMA_BASE}/api/tags`);
  const data = await res.json();
  return data.models; // [{ name, size, modified_at, ... }]
}

// ─── Chat (Non-Streaming) ─────────────────────────────────────
export async function chatOllama({ model, messages, systemPrompt, ragContext }) {
  const systemFull = buildSystemPrompt(systemPrompt, ragContext);

  const response = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model || "qwen2.5:14b",
      messages: [
        { role: "system", content: systemFull },
        ...messages,
      ],
      stream: false,
      options: {
        temperature: 0.7,       // kreativitas (0 = deterministik, 1 = kreatif)
        num_predict: 1024,      // max token output
        num_ctx: 8192,          // context window
        top_p: 0.9,
        repeat_penalty: 1.1,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.message.content; // string respons AI
}

// ─── Chat STREAMING (token per token) ────────────────────────
export async function chatOllamaStream({
  model,
  messages,
  systemPrompt,
  ragContext,
  onToken,      // callback: (token: string) => void
  onDone,       // callback: (fullText: string) => void
  onError,      // callback: (error: Error) => void
}) {
  const systemFull = buildSystemPrompt(systemPrompt, ragContext);

  try {
    const response = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || "qwen2.5:14b",
        messages: [
          { role: "system", content: systemFull },
          ...messages,
        ],
        stream: true, // ← aktifkan streaming
      }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Ollama streaming: tiap chunk adalah JSON line
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter(l => l.trim());

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.message?.content) {
            const token = json.message.content;
            fullText += token;
            onToken?.(token); // update UI token per token
          }
          if (json.done) {
            onDone?.(fullText);
          }
        } catch (_) {
          // skip malformed JSON lines
        }
      }
    }
  } catch (error) {
    onError?.(error);
  }
}

// ─── System Prompt Builder ────────────────────────────────────
function buildSystemPrompt(custom, ragContext) {
  const base = `Kamu adalah NARA — AI Assistant lokal untuk Indonesia.
Berjalan 100% di perangkat pengguna, tidak ada data dikirim ke internet.
Fasih Bahasa Indonesia dan Inggris, prioritaskan Bahasa Indonesia.
Fokus membantu UMKM, remote worker, dan profesional Indonesia.
Berikan respons actionable, konkret, dan relevan konteks Indonesia.
Gunakan markdown untuk format respons yang lebih baik.`;

  const ragSection = ragContext
    ? `\n\n[KONTEKS DOKUMEN RAG]\n${ragContext}\n[END KONTEKS]\n`
    : "";

  return base + ragSection + (custom ? `\n\n${custom}` : "");
}

// ─── Pull / Download Model ────────────────────────────────────
export async function pullModel(modelName, onProgress) {
  const response = await fetch(`${OLLAMA_BASE}/api/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: modelName, stream: true }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter(l => l.trim());
    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        // json.status: "pulling manifest", "downloading ...", "success"
        // json.completed, json.total: untuk progress bar
        onProgress?.(json);
      } catch (_) {}
    }
  }
}
```

### 4.3 Custom Hook useOllama

```javascript
// src/hooks/useOllama.js
import { useState, useCallback, useRef } from "react";
import { chatOllamaStream, checkOllamaHealth } from "../services/ollama";

export function useOllama() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [ollamaReady, setOllamaReady] = useState(null); // null=belum check
  const abortRef = useRef(false);

  // Cek apakah Ollama berjalan
  const checkHealth = useCallback(async () => {
    const health = await checkOllamaHealth();
    setOllamaReady(health.running);
    return health;
  }, []);

  // Kirim pesan dengan streaming
  const sendMessage = useCallback(async ({
    model,
    messages,
    ragContext,
    onComplete,
  }) => {
    setIsStreaming(true);
    setStreamingText("");
    abortRef.current = false;

    await chatOllamaStream({
      model,
      messages,
      ragContext,
      onToken: (token) => {
        if (abortRef.current) return;
        setStreamingText(prev => prev + token);
      },
      onDone: (fullText) => {
        setIsStreaming(false);
        setStreamingText("");
        onComplete?.(fullText);
      },
      onError: (err) => {
        setIsStreaming(false);
        console.error("Ollama error:", err);
      },
    });
  }, []);

  // Batalkan streaming yang sedang berjalan
  const abort = useCallback(() => {
    abortRef.current = true;
    setIsStreaming(false);
    setStreamingText("");
  }, []);

  return { sendMessage, isStreaming, streamingText, ollamaReady, checkHealth, abort };
}
```

### 4.4 Update ChatView untuk Pakai Ollama

```jsx
// src/components/Chat/ChatView.jsx — bagian sendMessage
import { useOllama } from "../../hooks/useOllama";

export default function ChatView() {
  const { sendMessage, isStreaming, streamingText } = useOllama();
  const [messages, setMessages] = useState([]);
  // ... state lainnya

  const handleSend = async (text) => {
    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    // Tambah placeholder untuk streaming
    const streamingId = Date.now();
    setMessages(prev => [...prev, {
      id: streamingId,
      role: "assistant",
      content: "",
      streaming: true,
    }]);

    await sendMessage({
      model: selectedModel,  // "qwen2.5:14b"
      messages: newMessages,
      ragContext: buildRagContext(activeDocs),
      onComplete: (fullText) => {
        // Ganti placeholder dengan teks final
        setMessages(prev => prev.map(m =>
          m.id === streamingId
            ? { ...m, content: fullText, streaming: false }
            : m
        ));
      },
    });
  };

  // Render streaming text realtime
  return (
    <>
      {messages.map(m => (
        <MessageBubble
          key={m.id || m.content}
          message={m}
          // Jika masih streaming, tampilkan streamingText sementara
          content={m.streaming ? streamingText : m.content}
        />
      ))}
    </>
  );
}
```

---

## 5. Integrasi Whisper (Speech-to-Text)

### 5.1 Install Whisper.cpp

```bash
# Clone dan build whisper.cpp
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp

# Build (Linux/macOS)
make

# Build dengan dukungan CoreML (macOS Apple Silicon)
make clean
WHISPER_COREML=1 make -j

# Build dengan CUDA (NVIDIA GPU)
WHISPER_CUBLAS=1 make -j

# Download model Bahasa Indonesia
# Model "medium" direkomendasikan untuk akurasi BI yang baik
bash ./models/download-ggml-model.sh medium
# Hasil: models/ggml-medium.bin (~1.5 GB)

# Atau download model yang sudah fine-tuned untuk Bahasa Indonesia:
# https://huggingface.co/cahya/whisper-medium-id
wget https://huggingface.co/cahya/whisper-medium-id/resolve/main/ggml-model.bin \
  -O models/ggml-medium-id.bin

# Test
./main -m models/ggml-medium-id.bin -l id -f test.wav
```

### 5.2 Whisper Command di Rust (Tauri)

```rust
// src-tauri/src/commands/whisper.rs

use std::process::Command;
use std::path::PathBuf;
use tauri::command;

#[derive(serde::Serialize)]
pub struct WhisperResult {
    pub text: String,
    pub language: String,
    pub duration_ms: u64,
}

/// Transkripsi file audio ke teks
#[command]
pub async fn transcribe_audio(
    audio_path: String,
    model: Option<String>,
    language: Option<String>,
) -> Result<WhisperResult, String> {
    let start = std::time::Instant::now();

    // Path ke executable whisper.cpp
    let whisper_bin = get_whisper_binary_path()?;

    // Path ke model (default: medium bahasa Indonesia)
    let model_path = model.unwrap_or_else(|| {
        get_models_dir()
            .join("ggml-medium-id.bin")
            .to_string_lossy()
            .to_string()
    });

    let lang = language.unwrap_or_else(|| "id".to_string());

    // Jalankan whisper.cpp sebagai subprocess
    let output = Command::new(&whisper_bin)
        .args([
            "-m", &model_path,           // path model
            "-f", &audio_path,           // file audio input
            "-l", &lang,                 // bahasa (id = Indonesia)
            "--output-txt",              // output ke stdout
            "--no-timestamps",           // tanpa timestamp di output
            "--print-special", "false",  // tanpa token spesial
            "-t", "4",                   // 4 threads CPU
        ])
        .output()
        .map_err(|e| format!("Gagal menjalankan whisper: {}", e))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Whisper error: {}", err));
    }

    let text = String::from_utf8_lossy(&output.stdout)
        .trim()
        .to_string();

    Ok(WhisperResult {
        text,
        language: lang,
        duration_ms: start.elapsed().as_millis() as u64,
    })
}

/// Record audio dari mikrofon dan langsung transkripsi
/// Menggunakan ffmpeg untuk capture audio
#[command]
pub async fn record_and_transcribe(
    duration_seconds: u32,
) -> Result<WhisperResult, String> {
    let temp_path = std::env::temp_dir().join("nara_recording.wav");
    let temp_str = temp_path.to_string_lossy().to_string();

    // Record audio dengan ffmpeg (perlu install ffmpeg)
    let status = Command::new("ffmpeg")
        .args([
            "-f", "alsa",                          // Linux audio input
            // "-f", "avfoundation",               // macOS
            // "-f", "dshow",                      // Windows
            "-i", "default",                       // device default
            "-t", &duration_seconds.to_string(),   // durasi rekaman
            "-ar", "16000",                        // sample rate 16kHz (whisper)
            "-ac", "1",                            // mono channel
            "-y",                                  // overwrite jika ada
            &temp_str,
        ])
        .status()
        .map_err(|e| format!("Gagal record audio: {}", e))?;

    if !status.success() {
        return Err("ffmpeg recording gagal".to_string());
    }

    // Transkripsi hasil rekaman
    transcribe_audio(temp_str, None, Some("id".to_string())).await
}

fn get_whisper_binary_path() -> Result<PathBuf, String> {
    // Cari di beberapa lokasi
    let candidates = vec![
        PathBuf::from("./whisper.cpp/main"),                    // development
        PathBuf::from("/usr/local/bin/whisper"),                // system install
        std::env::current_exe()
            .unwrap_or_default()
            .parent()
            .unwrap_or(&PathBuf::from("."))
            .join("whisper"),                                   // bundled
    ];
    candidates.into_iter()
        .find(|p| p.exists())
        .ok_or_else(|| "whisper binary tidak ditemukan".to_string())
}

fn get_models_dir() -> PathBuf {
    // Di production: dalam bundle Tauri
    // Di dev: relative path
    std::env::current_exe()
        .unwrap_or_default()
        .parent()
        .unwrap_or(&PathBuf::from("."))
        .join("models")
}
```

### 5.3 Whisper Hook di Frontend

```javascript
// src/hooks/useWhisper.js
import { useState, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useWhisper() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);

  // Untuk Web Audio API (browser recording)
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // ─── Metode 1: Via Tauri Command (production) ─────────────────
  const recordViaTauri = useCallback(async (durationSeconds = 5) => {
    setIsRecording(true);
    setError(null);

    try {
      // Panggil Rust command yang handle recording + transcription
      const result = await invoke("record_and_transcribe", {
        durationSeconds,
      });
      setTranscript(result.text);
      return result.text;
    } catch (err) {
      setError(err.toString());
      return null;
    } finally {
      setIsRecording(false);
      setIsTranscribing(false);
    }
  }, []);

  // ─── Metode 2: Web Audio API → kirim ke Tauri untuk transcribe ─
  const startRecording = useCallback(async () => {
    setIsRecording(true);
    setError(null);
    audioChunksRef.current = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus",
    });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    mediaRecorder.start(100); // collect chunks tiap 100ms
  }, []);

  const stopRecording = useCallback(async () => {
    setIsRecording(false);
    setIsTranscribing(true);

    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) return resolve(null);

      recorder.onstop = async () => {
        // Gabungkan audio chunks jadi satu blob
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        // Convert ke ArrayBuffer lalu kirim ke Rust via Tauri
        const arrayBuffer = await audioBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        try {
          // Tauri command: simpan file sementara lalu transcribe
          const result = await invoke("transcribe_audio_bytes", {
            audioBytes: Array.from(uint8Array),
            language: "id",
          });
          setTranscript(result.text);
          setIsTranscribing(false);
          resolve(result.text);
        } catch (err) {
          setError(err.toString());
          setIsTranscribing(false);
          resolve(null);
        }
      };

      recorder.stop();
      // Stop semua tracks dari stream
      recorder.stream.getTracks().forEach(track => track.stop());
    });
  }, []);

  return {
    isRecording,
    isTranscribing,
    transcript,
    error,
    startRecording,
    stopRecording,
    recordViaTauri,
  };
}
```

### 5.4 Komponen Voice Button

```jsx
// src/components/Chat/VoiceButton.jsx
import { useWhisper } from "../../hooks/useWhisper";

export default function VoiceButton({ onTranscript }) {
  const { isRecording, isTranscribing, startRecording, stopRecording } = useWhisper();

  const handleClick = async () => {
    if (isRecording) {
      const text = await stopRecording();
      if (text) onTranscript(text); // set ke input box
    } else {
      await startRecording();
    }
  };

  return (
    <button
      className={`voice-btn ${isRecording ? "recording" : ""} ${isTranscribing ? "transcribing" : ""}`}
      onClick={handleClick}
      disabled={isTranscribing}
      title={isRecording ? "Klik untuk stop & transkripsi" : "Klik untuk mulai rekam suara"}
    >
      {isTranscribing ? "⏳" : isRecording ? "⏹️" : "🎙️"}
    </button>
  );
}

// Penggunaan di InputArea:
// <VoiceButton onTranscript={(text) => setInputVal(text)} />
```

---

## 6. Integrasi OpenClaw (AI Agent)

### 6.1 Install OpenClaw

```bash
# Install Node.js terlebih dahulu (≥18.0.0)

# Install OpenClaw via npm
npm install -g openclaw

# Atau clone dan run dari source
git clone https://github.com/openclaw/openclaw.git
cd openclaw
npm install
npm run build

# Verifikasi
openclaw --version
```

### 6.2 Konfigurasi OpenClaw

```yaml
# ~/.openclaw/config.yaml

# LLM Backend — arahkan ke Ollama lokal
llm:
  provider: ollama
  base_url: http://localhost:11434
  model: qwen2.5:14b
  temperature: 0.3        # lebih deterministik untuk automation task
  max_tokens: 2048

# Interface — channel untuk menerima perintah
interfaces:
  whatsapp:
    enabled: true
    session_path: ~/.openclaw/whatsapp_session
    trigger_phrase: "@nara"     # pengguna ketik "@nara buat laporan"
    allowed_numbers:            # whitelist nomor yang bisa kasih perintah
      - "+62812xxxxxxxx"        # nomor owner/admin

  email:
    enabled: true
    imap_host: imap.gmail.com
    imap_port: 993
    username: ${EMAIL_USER}     # dari environment variable
    password: ${EMAIL_PASS}
    check_interval: 300         # cek inbox tiap 5 menit
    trigger_subject: "[NARA]"   # email dengan subject "[NARA] ..." akan diproses

  slack:
    enabled: false
    token: ${SLACK_TOKEN}
    channel: "#ai-assistant"

# Tools — apa yang boleh dilakukan OpenClaw
tools:
  file_manager:
    enabled: true
    allowed_dirs:
      - ~/Documents
      - ~/Desktop
    max_file_size_mb: 50

  web_browser:
    enabled: true
    allowed_domains: []         # kosong = semua domain diizinkan
    blocked_domains:
      - "*.gov.id"

  code_executor:
    enabled: false              # HATI-HATI: nonaktifkan di production

  calendar:
    enabled: false

# Privacy & Security
privacy:
  log_conversations: false      # jangan simpan log percakapan
  encrypt_sessions: true
  session_key_path: ~/.openclaw/session.key

# Server API — untuk komunikasi dengan NARA frontend
server:
  host: 127.0.0.1               # hanya lokal, tidak expose ke internet
  port: 7654
  auth_token: ${OPENCLAW_TOKEN}  # random token untuk auth
```

### 6.3 OpenClaw API Client

```javascript
// src/services/openclaw.js

const OPENCLAW_BASE = "http://127.0.0.1:7654";
const AUTH_TOKEN = window.__NARA_CONFIG__?.openclawToken || "";

// ─── Get Status OpenClaw ──────────────────────────────────────
export async function getOpenClawStatus() {
  try {
    const res = await fetch(`${OPENCLAW_BASE}/api/status`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });
    return await res.json();
    // { running: true, uptime: 3600, active_interfaces: ["whatsapp"], tasks_today: 156 }
  } catch {
    return { running: false };
  }
}

// ─── List Automations (Tasks) ─────────────────────────────────
export async function listAutomations() {
  const res = await fetch(`${OPENCLAW_BASE}/api/automations`, {
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
  });
  return res.json();
}

// ─── Toggle Automation ────────────────────────────────────────
export async function toggleAutomation(automationId, enabled) {
  const res = await fetch(`${OPENCLAW_BASE}/api/automations/${automationId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ enabled }),
  });
  return res.json();
}

// ─── Buat Automation Baru ─────────────────────────────────────
export async function createAutomation({
  name,
  trigger,        // { type: "schedule"|"whatsapp"|"email", config: {...} }
  actions,        // [{ type: "llm_generate"|"send_message"|"save_file", config }]
  description,
}) {
  const res = await fetch(`${OPENCLAW_BASE}/api/automations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, trigger, actions, description }),
  });
  return res.json();
}

// ─── Get Logs Aktivitas ───────────────────────────────────────
export async function getActivityLogs(limit = 50) {
  const res = await fetch(`${OPENCLAW_BASE}/api/logs?limit=${limit}`, {
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
  });
  return res.json();
}

// ─── Kirim Task Manual (trigger dari chat) ────────────────────
export async function runTask(task) {
  const res = await fetch(`${OPENCLAW_BASE}/api/tasks/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ task }),
    // task: "Kirimkan ringkasan laporan Q1 ke WhatsApp +62812xxx"
  });
  return res.json();
}
```

### 6.4 Contoh Automation Config

```javascript
// Contoh: Buat automation "Balas WA Pelanggan"
await createAutomation({
  name: "Balas WA Pelanggan",
  description: "Auto-reply pertanyaan produk via WhatsApp dengan info dari katalog",
  trigger: {
    type: "whatsapp",
    config: {
      match_pattern: "*",            // semua pesan masuk
      exclude_numbers: ["+62812xxx"], // kecuali nomor owner
      working_hours: {
        enabled: true,
        start: "08:00",
        end: "22:00",
        timezone: "Asia/Jakarta",
      },
    },
  },
  actions: [
    {
      type: "rag_search",            // cari di dokumen RAG dulu
      config: {
        index: "katalog_produk",
        top_k: 3,
      },
    },
    {
      type: "llm_generate",          // generate respons dengan Ollama
      config: {
        prompt_template: `
Kamu adalah customer service AI untuk toko online.
Konteks dari katalog: {{rag_results}}
Pesan pelanggan: {{message}}
Balas dengan ramah, informatif, dan dalam Bahasa Indonesia.
Maksimal 3 kalimat.
        `,
        model: "qwen2.5:14b",
      },
    },
    {
      type: "send_whatsapp",         // kirim balasan
      config: {
        reply_to: "{{sender}}",
        message: "{{llm_output}}",
      },
    },
  ],
});
```

### 6.5 Rust Command untuk Manage OpenClaw Process

```rust
// src-tauri/src/commands/openclaw.rs

use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::{command, State};

pub struct OpenClawProcess(pub Mutex<Option<Child>>);

/// Start OpenClaw agent
#[command]
pub async fn start_openclaw(
    openclaw_process: State<'_, OpenClawProcess>,
) -> Result<String, String> {
    let mut process = openclaw_process.0.lock().unwrap();

    if process.is_some() {
        return Ok("OpenClaw sudah berjalan".to_string());
    }

    let child = Command::new("openclaw")
        .args(["start", "--config", "~/.openclaw/config.yaml"])
        .spawn()
        .map_err(|e| format!("Gagal start OpenClaw: {}", e))?;

    *process = Some(child);
    Ok("OpenClaw berhasil distart".to_string())
}

/// Stop OpenClaw agent
#[command]
pub async fn stop_openclaw(
    openclaw_process: State<'_, OpenClawProcess>,
) -> Result<String, String> {
    let mut process = openclaw_process.0.lock().unwrap();

    if let Some(mut child) = process.take() {
        child.kill().map_err(|e| format!("Gagal stop: {}", e))?;
        return Ok("OpenClaw dihentikan".to_string());
    }

    Ok("OpenClaw tidak sedang berjalan".to_string())
}

/// Check apakah OpenClaw berjalan
#[command]
pub async fn openclaw_status(
    openclaw_process: State<'_, OpenClawProcess>,
) -> Result<bool, String> {
    let mut process = openclaw_process.0.lock().unwrap();
    if let Some(ref mut child) = *process {
        // Check apakah process masih hidup
        match child.try_wait() {
            Ok(None) => return Ok(true),  // masih berjalan
            _ => { *process = None; return Ok(false); } // sudah mati
        }
    }
    Ok(false)
}
```

---

## 7. Membungkus ke Tauri (Rust)

### 7.1 Setup Tauri

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install dependensi sistem (Ubuntu/Debian)
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev libssl-dev libgtk-3-dev \
  libayatana-appindicator3-dev librsvg2-dev

# Install Tauri CLI
cargo install tauri-cli

# Buat project Tauri + Vite (untuk project baru)
npm create tauri-app@latest nara-app
cd nara-app
npm install

# Atau: tambahkan Tauri ke project React yang sudah ada
npm install @tauri-apps/api
cargo tauri init
```

### 7.2 Konfigurasi Tauri

```json
// src-tauri/tauri.conf.json
{
  "productName": "NARA",
  "version": "1.0.0",
  "identifier": "id.nara.app",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "NARA — AI Assistant Lokal",
        "width": 1280,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false,
        "decorations": true,
        "transparent": false,
        "center": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; connect-src 'self' http://localhost:11434 http://127.0.0.1:7654; img-src 'self' data:; style-src 'unsafe-inline'"
    }
  },
  "bundle": {
    "active": true,
    "targets": ["deb", "rpm", "appimage", "msi", "dmg", "nsis"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "resources": [
      "models/**",           // bundling model Whisper
      "bin/**"               // bundling binary Whisper
    ]
  }
}
```

### 7.3 Main.rs — Entry Point Rust

```rust
// src-tauri/src/main.rs

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use commands::{
    ollama::{check_ollama, list_ollama_models, proxy_ollama_chat},
    whisper::{transcribe_audio, record_and_transcribe},
    system::{get_system_stats, get_hardware_info},
    openclaw::{start_openclaw, stop_openclaw, openclaw_status, OpenClawProcess},
    rag::{index_document, search_rag, list_indexed_docs},
};

use std::sync::Mutex;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        // Register state untuk OpenClaw process
        .manage(OpenClawProcess(Mutex::new(None)))

        // Register semua commands
        .invoke_handler(tauri::generate_handler![
            // Ollama
            check_ollama,
            list_ollama_models,
            proxy_ollama_chat,

            // Whisper
            transcribe_audio,
            record_and_transcribe,

            // System monitoring
            get_system_stats,
            get_hardware_info,

            // OpenClaw
            start_openclaw,
            stop_openclaw,
            openclaw_status,

            // RAG
            index_document,
            search_rag,
            list_indexed_docs,
        ])

        // Setup: jalankan Ollama dan OpenClaw saat app start
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Auto-start Ollama jika belum berjalan
                let _ = tauri::api::process::Command::new("ollama")
                    .args(["serve"])
                    .spawn();

                // Tunggu Ollama siap
                tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

                // Emit event ke frontend bahwa backend siap
                handle.emit_all("backend-ready", ()).ok();
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running NARA application");
}
```

### 7.4 System Stats Command (Rust)

```rust
// src-tauri/src/commands/system.rs

use sysinfo::{CpuExt, System, SystemExt, ComponentExt};
use tauri::command;

#[derive(serde::Serialize)]
pub struct SystemStats {
    pub cpu_usage: f32,           // persentase 0-100
    pub ram_used_gb: f32,
    pub ram_total_gb: f32,
    pub ram_usage_percent: f32,
    pub cpu_temp: Option<f32>,    // dalam Celsius
    pub uptime_seconds: u64,
}

#[derive(serde::Serialize)]
pub struct HardwareInfo {
    pub cpu_name: String,
    pub cpu_cores: usize,
    pub total_ram_gb: f32,
    pub os_name: String,
    pub hostname: String,
}

#[command]
pub async fn get_system_stats() -> SystemStats {
    let mut sys = System::new_all();
    sys.refresh_all();

    let cpu_usage = sys.global_cpu_info().cpu_usage();
    let ram_used = sys.used_memory() as f32 / 1024.0 / 1024.0 / 1024.0;
    let ram_total = sys.total_memory() as f32 / 1024.0 / 1024.0 / 1024.0;
    let ram_pct = (ram_used / ram_total) * 100.0;

    // CPU temperature (tidak semua platform support)
    let cpu_temp = sys.components().iter()
        .find(|c| c.label().to_lowercase().contains("cpu"))
        .map(|c| c.temperature());

    SystemStats {
        cpu_usage,
        ram_used_gb: ram_used,
        ram_total_gb: ram_total,
        ram_usage_percent: ram_pct,
        cpu_temp,
        uptime_seconds: sys.uptime(),
    }
}

#[command]
pub async fn get_hardware_info() -> HardwareInfo {
    let mut sys = System::new_all();
    sys.refresh_all();

    HardwareInfo {
        cpu_name: sys.global_cpu_info().brand().to_string(),
        cpu_cores: sys.cpus().len(),
        total_ram_gb: sys.total_memory() as f32 / 1024.0 / 1024.0 / 1024.0,
        os_name: sys.long_os_version().unwrap_or_default(),
        hostname: sys.host_name().unwrap_or_default(),
    }
}
```

### 7.5 Memanggil Tauri Commands dari React

```javascript
// src/hooks/useTauri.js
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

// Cek apakah berjalan dalam Tauri (bukan browser biasa)
export const isTauri = () => typeof window.__TAURI__ !== "undefined";

// Hook untuk system stats
export function useSystemStats(intervalMs = 2000) {
  const [stats, setStats] = useState({
    cpu_usage: 0, ram_usage_percent: 0, cpu_temp: null
  });

  useEffect(() => {
    if (!isTauri()) return; // skip di browser

    const fetchStats = async () => {
      try {
        const s = await invoke("get_system_stats");
        setStats(s);
      } catch (e) {
        console.warn("Tidak bisa ambil stats:", e);
      }
    };

    fetchStats();
    const timer = setInterval(fetchStats, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return stats;
}

// Hook untuk listen event dari backend
export function useBackendEvents() {
  const [backendReady, setBackendReady] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;

    const unlisten = listen("backend-ready", () => {
      setBackendReady(true);
    });

    return () => { unlisten.then(f => f()); };
  }, []);

  return { backendReady };
}
```

### 7.6 Build & Distribusi

```bash
# Development mode
cargo tauri dev

# Build production (semua platform)
cargo tauri build

# Output:
# Linux:   src-tauri/target/release/bundle/deb/nara_1.0.0_amd64.deb
#          src-tauri/target/release/bundle/rpm/nara-1.0.0-1.x86_64.rpm
#          src-tauri/target/release/bundle/appimage/nara_1.0.0_amd64.AppImage
# Windows: src-tauri/target/release/bundle/msi/nara_1.0.0_x64_en-US.msi
#          src-tauri/target/release/bundle/nsis/nara_1.0.0_x64-setup.exe
# macOS:   src-tauri/target/release/bundle/dmg/nara_1.0.0_x64.dmg

# Build hanya untuk platform tertentu
cargo tauri build --target x86_64-pc-windows-msvc  # Windows
cargo tauri build --target x86_64-apple-darwin      # macOS Intel
cargo tauri build --target aarch64-apple-darwin     # macOS Apple Silicon
cargo tauri build --target x86_64-unknown-linux-gnu # Linux

# Cargo.toml dependencies yang dibutuhkan
# [dependencies]
# serde = { version = "1", features = ["derive"] }
# serde_json = "1"
# tokio = { version = "1", features = ["full"] }
# tauri = { version = "2", features = [] }
# sysinfo = "0.30"  # untuk system stats
# reqwest = { version = "0.12", features = ["json"] }  # untuk proxy Ollama
```

---

## 8. RAG Engine Implementation

### 8.1 Overview RAG Flow

```
Dokumen (PDF/DOCX/XLSX)
         │
         ▼
[Text Extraction]
 • PDF: pdf.js atau pdfminer
 • DOCX: mammoth.js
 • XLSX: SheetJS
         │
         ▼
[Text Chunking]
 • Split tiap ~500 token
 • Overlap 50 token antar chunk
 • Preserve paragraph boundaries
         │
         ▼
[Embedding Generation]
 • Gunakan Ollama embedding endpoint
 • Model: nomic-embed-text atau mxbai-embed-large
         │
         ▼
[Vector Store]
 • Simpan di IndexedDB (browser) atau SQLite (Tauri)
 • Untuk Tauri: hnswlib-rs atau usearch
         │
         ▼
Saat User Bertanya:
[Query → Embed → Vector Search → Top-K Chunks → Inject ke LLM Prompt]
```

### 8.2 RAG Service JavaScript

```javascript
// src/services/rag.js

const OLLAMA_BASE = "http://localhost:11434";

// ─── Chunking Teks ────────────────────────────────────────────
export function chunkText(text, chunkSize = 500, overlap = 50) {
  const words = text.split(/\s+/);
  const chunks = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim()) chunks.push(chunk);
    if (i + chunkSize >= words.length) break;
  }

  return chunks;
}

// ─── Generate Embedding via Ollama ───────────────────────────
export async function generateEmbedding(text) {
  const res = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "nomic-embed-text",  // pull dulu: ollama pull nomic-embed-text
      prompt: text,
    }),
  });
  const data = await res.json();
  return data.embedding; // float array [0.123, -0.456, ...]
}

// ─── Cosine Similarity ────────────────────────────────────────
export function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (magA * magB);
}

// ─── In-Memory Vector Store ───────────────────────────────────
// Di production gunakan IndexedDB atau SQLite via Tauri
class VectorStore {
  constructor() {
    this.documents = []; // [{ id, docName, chunkText, embedding, chunkIndex }]
  }

  async addDocument(docName, text) {
    const chunks = chunkText(text);
    const newDocs = [];

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i]);
      newDocs.push({
        id: `${docName}-${i}`,
        docName,
        chunkText: chunks[i],
        embedding,
        chunkIndex: i,
      });
    }

    this.documents.push(...newDocs);
    return newDocs.length; // jumlah chunks yang diindeks
  }

  async search(query, topK = 3) {
    if (this.documents.length === 0) return [];

    const queryEmbedding = await generateEmbedding(query);

    const scored = this.documents.map(doc => ({
      ...doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(d => ({
        docName: d.docName,
        text: d.chunkText,
        score: d.score,
      }));
  }

  removeDocument(docName) {
    this.documents = this.documents.filter(d => d.docName !== docName);
  }
}

// Singleton store
export const vectorStore = new VectorStore();

// ─── Extract Text dari File ───────────────────────────────────
export async function extractTextFromFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();

  if (ext === "txt" || ext === "md") {
    return await file.text();
  }

  if (ext === "pdf") {
    // Gunakan PDF.js
    const pdfjsLib = await import("pdfjs-dist");
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(" ") + "\n";
    }
    return text;
  }

  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  throw new Error(`Format file ${ext} belum didukung`);
}

// ─── Hook untuk pakai RAG ─────────────────────────────────────
// src/hooks/useRAG.js
export function useRAG() {
  const [docs, setDocs] = useState([]);
  const [isIndexing, setIsIndexing] = useState(false);

  const addDocument = async (file) => {
    setIsIndexing(true);
    try {
      const text = await extractTextFromFile(file);
      const chunkCount = await vectorStore.addDocument(file.name, text);
      setDocs(prev => [...prev, {
        name: file.name,
        size: file.size,
        chunks: chunkCount,
        active: true,
      }]);
    } finally {
      setIsIndexing(false);
    }
  };

  const searchDocs = async (query) => {
    const activeDocs = docs.filter(d => d.active).map(d => d.name);
    if (activeDocs.length === 0) return null;

    const results = await vectorStore.search(query, 3);
    const filtered = results.filter(r => activeDocs.includes(r.docName));

    if (filtered.length === 0) return null;

    return filtered
      .map(r => `[${r.docName}]\n${r.text}`)
      .join("\n\n---\n\n");
  };

  return { docs, isIndexing, addDocument, searchDocs };
}
```

---

## 9. Environment Setup & Checklist

### 9.1 Prerequisites Lengkap

```bash
# ── 1. Node.js ──────────────────────────────────────────────────
# Cek: node --version  (butuh >= 18.0.0)
curl -fsSL https://fnm.vercel.app/install | bash
fnm install 20
fnm use 20

# ── 2. Rust ─────────────────────────────────────────────────────
# Cek: rustc --version
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# ── 3. Tauri CLI ────────────────────────────────────────────────
cargo install tauri-cli
# Cek: cargo tauri --version

# ── 4. Ollama ───────────────────────────────────────────────────
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen2.5:14b
ollama pull nomic-embed-text   # untuk RAG embedding

# ── 5. Whisper.cpp ──────────────────────────────────────────────
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp && make && cd ..
# Download model Bahasa Indonesia
bash whisper.cpp/models/download-ggml-model.sh medium

# ── 6. ffmpeg (untuk audio recording) ──────────────────────────
# Ubuntu: sudo apt install ffmpeg
# macOS:  brew install ffmpeg
# Windows: https://ffmpeg.org/download.html

# ── 7. OpenClaw ────────────────────────────────────────────────
npm install -g openclaw
```

### 9.2 Checklist Sebelum Build Production

```markdown
PRE-BUILD CHECKLIST

Hardware & Dependencies:
[ ] AMD Ryzen AI 9 atau Intel Core Ultra dengan NPU
[ ] Minimal 32GB RAM
[ ] Node.js >= 18.0.0 terinstall
[ ] Rust stable terinstall
[ ] Tauri CLI terinstall

LLM Backend:
[ ] Ollama terinstall dan berjalan (cek: curl http://localhost:11434)
[ ] Model qwen2.5:14b sudah di-pull
[ ] Model nomic-embed-text sudah di-pull (untuk RAG)

Voice:
[ ] whisper.cpp ter-build (ada file ./main atau ./whisper)
[ ] Model ggml-medium-id.bin sudah didownload
[ ] ffmpeg terinstall

Automation:
[ ] OpenClaw terinstall (cek: openclaw --version)
[ ] File ~/.openclaw/config.yaml sudah dikonfigurasi
[ ] Nomor WhatsApp sudah di-link ke OpenClaw

Security:
[ ] Environment variables sudah diset (.env)
[ ] OPENCLAW_TOKEN sudah di-generate (random 32 char)
[ ] Firewall: port 11434 dan 7654 hanya bisa diakses localhost

Build:
[ ] npm run build berhasil (tidak ada error)
[ ] cargo tauri build berhasil
[ ] Installer berhasil dibuat
[ ] Test install di mesin bersih
```

### 9.3 Environment Variables

```bash
# .env (jangan commit ke git!)

# OpenClaw
OPENCLAW_TOKEN=random_secret_token_32_chars_minimum

# Email integration (opsional)
EMAIL_USER=narabusiness@gmail.com
EMAIL_PASS=app_specific_password_from_google

# Slack (opsional)
SLACK_TOKEN=xoxb-your-slack-bot-token

# Paths (override default jika perlu)
WHISPER_MODEL_PATH=/path/to/ggml-medium-id.bin
OLLAMA_BASE_URL=http://localhost:11434
OPENCLAW_PORT=7654
```

### 9.4 Scripts Berguna

```bash
# scripts/start-all.sh — Start semua service sekaligus
#!/bin/bash
echo "🚀 Starting NARA backend services..."

# Start Ollama
ollama serve &
OLLAMA_PID=$!
echo "✓ Ollama started (PID: $OLLAMA_PID)"

# Tunggu Ollama ready
sleep 2

# Start OpenClaw
openclaw start --config ~/.openclaw/config.yaml &
OPENCLAW_PID=$!
echo "✓ OpenClaw started (PID: $OPENCLAW_PID)"

echo "✅ All services running. Starting NARA app..."

# Cleanup saat app ditutup
trap "kill $OLLAMA_PID $OPENCLAW_PID" EXIT
```

```bash
# scripts/check-deps.sh — Cek semua dependensi
#!/bin/bash
echo "Checking NARA dependencies..."

check() { command -v $1 >/dev/null 2>&1 && echo "✓ $1" || echo "✗ $1 (MISSING)"; }

check node
check npm
check cargo
check ollama
check openclaw
check ffmpeg
check whisper 2>/dev/null || check ./whisper.cpp/main || echo "✗ whisper.cpp (MISSING)"

echo ""
echo "Checking Ollama models..."
ollama list | grep -E "qwen2.5:14b|nomic-embed" || echo "✗ Required models not pulled"

echo ""
echo "Checking ports..."
curl -s http://localhost:11434 > /dev/null && echo "✓ Ollama running on :11434" || echo "✗ Ollama not running"
curl -s http://127.0.0.1:7654 > /dev/null && echo "✓ OpenClaw running on :7654" || echo "✗ OpenClaw not running"
```

---

## Quick Reference

| Komponen | Port/Path | Command |
|---|---|---|
| Ollama API | `localhost:11434` | `ollama serve` |
| OpenClaw API | `127.0.0.1:7654` | `openclaw start` |
| Whisper binary | `./whisper.cpp/main` | `./main -m model.bin -f audio.wav` |
| Tauri dev | — | `cargo tauri dev` |
| Tauri build | — | `cargo tauri build` |

---

*Dokumentasi ini dibuat untuk NARA v1.0.0-beta — AI Assistant Lokal Indonesia*  
*Stack: React + Tauri (Rust) + Ollama + Whisper.cpp + OpenClaw*  
*Zero Cloud · Privacy First · Made in Indonesia 🇮🇩*
