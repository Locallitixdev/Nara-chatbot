// ─── Knowledge Base — IndexedDB Persistent Store ──────────────
// Menyimpan knowledge entries dari background sync
// Digunakan untuk auto-inject context terbaru ke chat

const DB_NAME = 'nara_knowledge';
const DB_VERSION = 1;
const STORE_NAME = 'entries';
const MAX_AGE_DAYS = 30;

// ─── IndexedDB Helpers ────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('source', 'source', { unique: false });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('syncedAt', 'syncedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbTransaction(mode, callback) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const result = callback(store);

      tx.oncomplete = () => {
        db.close();
        resolve(result);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  });
}

// ─── Cosine Similarity ───────────────────────────────────────
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

// ─── Knowledge Base Class ─────────────────────────────────────
class KnowledgeBase {
  constructor() {
    this._cache = [];
    this._loaded = false;
  }

  // Load semua entries ke memory cache untuk search cepat
  async loadCache() {
    try {
      const entries = await this.getAllEntries();
      this._cache = entries;
      this._loaded = true;
      console.log(`[KnowledgeBase] Cache loaded: ${entries.length} entries`);
    } catch (e) {
      console.error('[KnowledgeBase] Failed to load cache:', e);
      this._cache = [];
    }
  }

  // Tambah entry baru
  async addEntry(entry) {
    const record = {
      id: entry.id || `kb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: entry.title,
      content: entry.content,
      summary: entry.summary || entry.content.substring(0, 200),
      source: entry.source,
      sourceUrl: entry.sourceUrl || '',
      date: entry.date || new Date().toISOString(),
      embedding: entry.embedding || null,
      syncedAt: new Date().toISOString(),
    };

    await dbTransaction('readwrite', (store) => {
      store.put(record);
    });

    // Update cache
    const idx = this._cache.findIndex(e => e.id === record.id);
    if (idx >= 0) {
      this._cache[idx] = record;
    } else {
      this._cache.push(record);
    }

    return record.id;
  }

  // Batch add entries
  async addEntries(entries) {
    await dbTransaction('readwrite', (store) => {
      for (const entry of entries) {
        const record = {
          id: entry.id || `kb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          title: entry.title,
          content: entry.content,
          summary: entry.summary || entry.content.substring(0, 200),
          source: entry.source,
          sourceUrl: entry.sourceUrl || '',
          date: entry.date || new Date().toISOString(),
          embedding: entry.embedding || null,
          syncedAt: new Date().toISOString(),
        };
        store.put(record);
      }
    });

    await this.loadCache();
  }

  // Get semua entries
  getAllEntries() {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          db.close();
          resolve(request.result || []);
        };
        request.onerror = () => {
          db.close();
          reject(request.error);
        };
      } catch (e) {
        resolve([]);
      }
    });
  }

  // Cek apakah entry sudah ada (by title + source)
  async exists(title, source) {
    if (!this._loaded) await this.loadCache();
    return this._cache.some(
      e => e.title === title && e.source === source
    );
  }

  // Semantic search menggunakan embedding
  async search(queryEmbedding, topK = 3, minScore = 0.3) {
    if (!this._loaded) await this.loadCache();
    if (!queryEmbedding || this._cache.length === 0) return [];

    const results = this._cache
      .filter(e => e.embedding)
      .map(entry => ({
        id: entry.id,
        title: entry.title,
        content: entry.content,
        source: entry.source,
        date: entry.date,
        score: cosineSimilarity(queryEmbedding, entry.embedding),
      }))
      .filter(r => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return results;
  }

  // Keyword search fallback (tanpa embedding)
  searchByKeyword(query, topK = 3) {
    if (!this._loaded || this._cache.length === 0) return [];
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (keywords.length === 0) return [];

    return this._cache
      .map(entry => {
        const text = `${entry.title} ${entry.content}`.toLowerCase();
        const matchCount = keywords.filter(kw => text.includes(kw)).length;
        return { ...entry, score: matchCount / keywords.length };
      })
      .filter(r => r.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  // Cleanup entries yang sudah terlalu lama
  async cleanup() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_AGE_DAYS);
    const cutoffStr = cutoff.toISOString();

    const toDelete = this._cache.filter(e => e.syncedAt < cutoffStr);
    if (toDelete.length === 0) return 0;

    await dbTransaction('readwrite', (store) => {
      for (const entry of toDelete) {
        store.delete(entry.id);
      }
    });

    this._cache = this._cache.filter(e => e.syncedAt >= cutoffStr);
    console.log(`[KnowledgeBase] Cleaned up ${toDelete.length} old entries`);
    return toDelete.length;
  }

  // Stats
  getStats() {
    return {
      totalEntries: this._cache.length,
      withEmbeddings: this._cache.filter(e => e.embedding).length,
      sources: [...new Set(this._cache.map(e => e.source))],
      oldestEntry: this._cache.length > 0
        ? this._cache.reduce((min, e) => e.syncedAt < min ? e.syncedAt : min, this._cache[0].syncedAt)
        : null,
      newestEntry: this._cache.length > 0
        ? this._cache.reduce((max, e) => e.syncedAt > max ? e.syncedAt : max, this._cache[0].syncedAt)
        : null,
    };
  }
}

// Singleton
export const knowledgeBase = new KnowledgeBase();
export default knowledgeBase;
