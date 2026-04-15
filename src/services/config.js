// ─── Centralized Config ───────────────────────────────────────
// Semua konfigurasi service ada di sini

const config = {
  ollama: {
    // Di dev mode: Vite proxy /api/ollama → localhost:11434
    // Di Tauri prod: perlu direct URL
    baseUrl: import.meta.env.VITE_OLLAMA_BASE_URL || '/api/ollama',
    defaultModel: import.meta.env.VITE_DEFAULT_MODEL || 'llama3.2:1b',
    options: {
      temperature: 0.7,
      num_predict: 2048,
      num_ctx: 8192,
      top_p: 0.9,
      repeat_penalty: 1.1,
    },
  },
  openclaw: {
    baseUrl: import.meta.env.VITE_OPENCLAW_BASE_URL || 'http://127.0.0.1:7654',
    token: import.meta.env.VITE_OPENCLAW_TOKEN || '',
  },
};

export function getOllamaUrl(path = '') {
  return `${config.ollama.baseUrl}${path}`;
}

export function getAuthHeaders() {
  if (!config.openclaw.token) {
    console.warn('OpenClaw token not configured. Set VITE_OPENCLAW_TOKEN in .env');
  }
  return {
    'Authorization': `Bearer ${config.openclaw.token}`,
    'Content-Type': 'application/json',
  };
}

export const OLLAMA_BASE = config.ollama.baseUrl;
export const OPENCLAW_BASE = config.openclaw.baseUrl;
export const DEFAULT_MODEL = config.ollama.defaultModel;
export const OLLAMA_OPTIONS = config.ollama.options;

export default config;
