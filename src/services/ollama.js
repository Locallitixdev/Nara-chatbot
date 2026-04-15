import { getOllamaUrl, DEFAULT_MODEL, OLLAMA_OPTIONS } from './config';

// ─── Health Check ─────────────────────────────────────────────
export async function checkOllamaHealth() {
  try {
    const res = await fetch(getOllamaUrl('/api/tags'));
    const data = await res.json();
    return {
      running: true,
      models: data.models?.map(m => m.name) || [],
    };
  } catch {
    return { running: false, models: [] };
  }
}

// ─── List Models ──────────────────────────────────────────────
export async function listModels() {
  const res = await fetch(getOllamaUrl('/api/tags'));
  const data = await res.json();
  return data.models || [];
}

// ─── Chat STREAMING ───────────────────────────────────────────
export async function chatOllamaStream({
  model = DEFAULT_MODEL,
  messages,
  systemPrompt,
  ragContext,
  onToken,
  onDone,
  onError,
  signal, // AbortController.signal
}) {
  const systemFull = buildSystemPrompt(systemPrompt, ragContext);

  try {
    const response = await fetch(getOllamaUrl('/api/chat'), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemFull },
          ...messages,
        ],
        stream: true,
        options: OLLAMA_OPTIONS,
      }),
      signal, // pass abort signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter(l => l.trim());

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.message?.content) {
            fullText += json.message.content;
            onToken?.(json.message.content);
          }
          if (json.done) {
            onDone?.(fullText);
          }
        } catch {}
      }
    }
  } catch (error) {
    // Don't report abort as error
    if (error.name === 'AbortError') {
      onDone?.(null);
      return;
    }
    onError?.(error);
  }
}

// ─── System Prompt Builder ────────────────────────────────────
function buildSystemPrompt(custom, ragContext) {
  const base = `Kamu adalah NARA — AI Assistant lokal untuk Indonesia.
Berjalan 100% di perangkat pengguna, tidak ada data dikirim ke internet.
Fasih Bahasa Indonesia dan Inggris, prioritaskan Bahasa Indonesia.
Fokus membantu UMKM, remote worker, dan profesional Indonesia.
Berikan respons yang actionable, konkret, dan relevan konteks Indonesia.
Gunakan markdown untuk format respons yang lebih baik.`;

  const ragSection = ragContext
    ? `\n\n[DOKUMEN AKTIF RAG]\n${ragContext}\n[END RAG]`
    : "";

  return base + ragSection + (custom ? `\n\n${custom}` : "");
}

// ─── Pull / Download Model ────────────────────────────────────
export async function pullModel(modelName, onProgress) {
  const response = await fetch(getOllamaUrl('/api/pull'), {
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
        onProgress?.(json);
      } catch {}
    }
  }
}
