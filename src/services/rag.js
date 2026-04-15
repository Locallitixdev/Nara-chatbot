import { getOllamaUrl } from './config';

const DOCS_STORAGE_KEY = 'nara_docs_content';

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

// ─── Generate Embedding via Ollama (through proxy) ────────────
export async function generateEmbedding(text) {
  const res = await fetch(getOllamaUrl('/api/embeddings'), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "nomic-embed-text",
      prompt: text,
    }),
  });
  const data = await res.json();
  return data.embedding;
}

// ─── Cosine Similarity ───────────────────────────────────────
export function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (magA * magB);
}

// ─── Storage Helpers ──────────────────────────────────────────
function saveDocsContent(docsContent) {
  try {
    localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(docsContent));
  } catch (e) {
    console.error('Failed to save docs content:', e);
  }
}

function loadDocsContent() {
  try {
    const data = localStorage.getItem(DOCS_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error('Failed to load docs content:', e);
    return {};
  }
}

function removeDocContent(docId) {
  const content = loadDocsContent();
  delete content[docId];
  saveDocsContent(content);
}

// ─── Vector Store ─────────────────────────────────────────────
class VectorStore {
  constructor() {
    this.documents = new Map();
    this.loadFromStorage();
  }

  loadFromStorage() {
    const savedContent = loadDocsContent();

    for (const [docId, docData] of Object.entries(savedContent)) {
      if (docData.chunks) {
        this.documents.set(docId, {
          name: docData.name,
          chunks: docData.chunks.map(c => ({
            text: c.text,
            embedding: c.embedding,
          })),
        });
      }
    }
  }

  async addDocument(docId, docName, text) {
    const chunks = chunkText(text);
    const embeddedChunks = [];
    const chunkData = [];

    for (const chunk of chunks) {
      try {
        const embedding = await generateEmbedding(chunk);
        embeddedChunks.push({ text: chunk, embedding });
        chunkData.push({ text: chunk, embedding });
      } catch (e) {
        console.error(`Failed to embed chunk:`, e);
      }
    }

    this.documents.set(docId, { name: docName, chunks: embeddedChunks });

    const allContent = loadDocsContent();
    allContent[docId] = { name: docName, chunks: chunkData };
    saveDocsContent(allContent);

    return embeddedChunks.length;
  }

  async search(query, topK = 3) {
    if (this.documents.size === 0) return [];

    try {
      const queryEmbedding = await generateEmbedding(query);
      const results = [];

      for (const [docId, doc] of this.documents) {
        for (const chunk of doc.chunks) {
          const score = cosineSimilarity(queryEmbedding, chunk.embedding);
          results.push({ docId, docName: doc.name, text: chunk.text, score });
        }
      }

      return results.sort((a, b) => b.score - a.score).slice(0, topK);
    } catch (e) {
      console.error('Search error:', e);
      return [];
    }
  }

  removeDocument(docId) {
    this.documents.delete(docId);
    removeDocContent(docId);
  }

  getActiveDocuments(activeDocIds) {
    return Array.from(this.documents.entries())
      .filter(([id]) => activeDocIds.includes(id))
      .map(([id, doc]) => ({ id, name: doc.name, chunkCount: doc.chunks.length }));
  }

  hasDocuments() {
    return this.documents.size > 0;
  }

  getDocumentCount() {
    return this.documents.size;
  }
}

// Singleton store
export const vectorStore = new VectorStore();

// ─── Build RAG Context ────────────────────────────────────────
export async function buildRagContext(query, activeDocIds, topK = 3) {
  if (activeDocIds.length === 0 || !query) return null;

  const results = await vectorStore.search(query, topK);
  if (results.length === 0) return null;

  const relevantResults = results.filter(r => activeDocIds.includes(r.docId));
  if (relevantResults.length === 0) return null;

  return relevantResults.map(r => `[${r.docName}]\n${r.text}`).join('\n\n');
}
