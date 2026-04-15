import { getOllamaUrl, DEFAULT_MODEL, OLLAMA_OPTIONS } from './config';
import { knowledgeBase } from './knowledgeBase';
import { vectorDB } from './vectorDB';

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

// ─── Auto Knowledge Search ────────────────────────────────────
async function getKnowledgeContext(userMessage) {
  const formatResults = (results) =>
    results.map(r =>
      `[${r.source} — ${new Date(r.date).toLocaleDateString('id-ID')}]\n${r.title}\n${r.content}`
    ).join('\n\n');

  try {
    // Generate embedding dari pertanyaan user
    const embRes = await fetch(getOllamaUrl('/api/embeddings'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: userMessage,
      }),
    });

    if (embRes.ok) {
      const embData = await embRes.json();
      if (embData.embedding) {
        // 1. Primary: Search Qdrant vector DB
        try {
          const qdrantResults = await vectorDB.searchSimilar(embData.embedding, 5, 0.35);
          if (qdrantResults.length > 0) {
            console.log(`[AutoKnowledge] Qdrant: ${qdrantResults.length} results`);
            return formatResults(qdrantResults);
          }
        } catch (e) {
          console.warn('[AutoKnowledge] Qdrant search failed, falling back:', e);
        }

        // 2. Fallback: Search IndexedDB (offline mode)
        const localResults = await knowledgeBase.search(embData.embedding, 3, 0.35);
        if (localResults.length > 0) {
          console.log(`[AutoKnowledge] IndexedDB: ${localResults.length} results`);
          return formatResults(localResults);
        }
      }
    }

    // 3. Last resort: keyword search di IndexedDB
    const kwResults = knowledgeBase.searchByKeyword(userMessage, 3);
    if (kwResults.length > 0) {
      console.log(`[AutoKnowledge] Keyword: ${kwResults.length} results`);
      return formatResults(kwResults);
    }
  } catch (e) {
    console.warn('[AutoKnowledge] Search failed:', e);
  }

  return null;
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
  // Auto-inject knowledge dari knowledge base
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const knowledgeContext = lastUserMsg
    ? await getKnowledgeContext(lastUserMsg.content)
    : null;

  const systemFull = buildSystemPrompt(systemPrompt, ragContext, knowledgeContext);

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
function buildSystemPrompt(custom, ragContext, knowledgeContext) {
  // Inject current date & time so model always knows
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
  const timeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Jakarta',
    hour12: false,
  });

  const base = `Kamu adalah NARA — AI Assistant lokal untuk Indonesia.
Berjalan 100% di perangkat pengguna, tidak ada data dikirim ke internet.
Fasih Bahasa Indonesia dan Inggris, prioritaskan Bahasa Indonesia.
Fokus membantu UMKM, remote worker, dan profesional Indonesia.
Berikan respons yang actionable, konkret, dan relevan konteks Indonesia.
Gunakan markdown untuk format respons yang lebih baik.

[WAKTU SAAT INI]
Tanggal: ${dateStr}
Jam: ${timeStr} WIB
[END WAKTU]`;

  // Knowledge base context (otomatis dari background sync)
  const knowledgeSection = knowledgeContext
    ? `\n\n[PENGETAHUAN TERKINI]\nBerikut informasi terbaru yang relevan dengan pertanyaan pengguna. Gunakan sebagai referensi jika relevan:\n${knowledgeContext}\n[END PENGETAHUAN]`
    : "";

  const ragSection = ragContext
    ? `\n\n[DOKUMEN AKTIF RAG]\n${ragContext}\n[END RAG]`
    : "";

  return base + knowledgeSection + ragSection + (custom ? `\n\n${custom}` : "");
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
