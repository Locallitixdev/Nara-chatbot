// ─── Knowledge Sync — Background Self-Learning ───────────────
// Otomatis fetch berita & info terbaru saat online
// Primary: Qdrant vector DB  |  Fallback: IndexedDB (offline)

import { knowledgeBase } from './knowledgeBase';
import { vectorDB } from './vectorDB';
import { getOllamaUrl } from './config';

const SYNC_INTERVAL = 2 * 60 * 60 * 1000; // 2 jam
const SYNC_STATE_KEY = 'nara_sync_state';
const MAX_ARTICLES_PER_SOURCE = 15;

// ─── RSS Feed Sources ─────────────────────────────────────────
const RSS_SOURCES = [
  {
    id: 'detik',
    name: 'Detik.com',
    url: '/api/news/detik',
    category: 'news',
  },
  {
    id: 'kompas',
    name: 'Kompas.com',
    url: '/api/news/kompas',
    category: 'news',
  },
  {
    id: 'tempo',
    name: 'Tempo.co',
    url: '/api/news/tempo',
    category: 'news',
  },
  {
    id: 'bbc',
    name: 'BBC Indonesia',
    url: '/api/news/bbc',
    category: 'news',
  },
];

// ─── Wikipedia Trending ───────────────────────────────────────
const WIKI_SOURCE = {
  id: 'wikipedia',
  name: 'Wikipedia ID',
  url: '/api/wiki/featured',
  category: 'encyclopedia',
};

// ─── State Management ─────────────────────────────────────────
function getSyncState() {
  try {
    const data = localStorage.getItem(SYNC_STATE_KEY);
    return data ? JSON.parse(data) : { lastSync: null, status: 'idle' };
  } catch {
    return { lastSync: null, status: 'idle' };
  }
}

function setSyncState(state) {
  localStorage.setItem(SYNC_STATE_KEY, JSON.stringify({
    ...getSyncState(),
    ...state,
    updatedAt: new Date().toISOString(),
  }));
}

// ─── RSS Parser ───────────────────────────────────────────────
function parseRSS(xmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      console.warn('[KnowledgeSync] RSS parse error');
      return [];
    }

    const items = doc.querySelectorAll('item');
    const articles = [];

    items.forEach((item, idx) => {
      if (idx >= MAX_ARTICLES_PER_SOURCE) return;

      const title = item.querySelector('title')?.textContent?.trim() || '';
      const description = item.querySelector('description')?.textContent?.trim() || '';
      const link = item.querySelector('link')?.textContent?.trim() || '';
      const pubDate = item.querySelector('pubDate')?.textContent?.trim() || '';

      // Strip HTML tags dari description
      const cleanDesc = description.replace(/<[^>]*>/g, '').trim();

      if (title && cleanDesc) {
        articles.push({
          title,
          content: cleanDesc,
          sourceUrl: link,
          date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        });
      }
    });

    return articles;
  } catch (e) {
    console.error('[KnowledgeSync] RSS parse error:', e);
    return [];
  }
}

// ─── Wikipedia Parser ─────────────────────────────────────────
function parseWikipediaResponse(data) {
  const articles = [];

  try {
    // Featured article
    if (data.tfa) {
      articles.push({
        title: data.tfa.titles?.normalized || data.tfa.title || 'Wikipedia Featured',
        content: data.tfa.extract || '',
        sourceUrl: data.tfa.content_urls?.desktop?.page || '',
        date: new Date().toISOString(),
      });
    }

    // Most read articles
    if (data.mostread?.articles) {
      for (const article of data.mostread.articles.slice(0, 10)) {
        if (article.extract && article.extract.length > 50) {
          articles.push({
            title: article.titles?.normalized || article.title || '',
            content: article.extract || '',
            sourceUrl: article.content_urls?.desktop?.page || '',
            date: new Date().toISOString(),
          });
        }
      }
    }

    // On this day
    if (data.onthisday) {
      for (const event of data.onthisday.slice(0, 5)) {
        if (event.text) {
          articles.push({
            title: `Hari Ini dalam Sejarah: ${event.year || ''}`,
            content: event.text,
            sourceUrl: event.pages?.[0]?.content_urls?.desktop?.page || '',
            date: new Date().toISOString(),
          });
        }
      }
    }
  } catch (e) {
    console.error('[KnowledgeSync] Wikipedia parse error:', e);
  }

  return articles;
}

// ─── Generate Embedding ───────────────────────────────────────
async function generateEmbedding(text) {
  try {
    const res = await fetch(getOllamaUrl('/api/embeddings'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: text.substring(0, 1000), // Limit untuk performance
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.embedding || null;
  } catch {
    return null;
  }
}

// ─── Fetch Single Source ──────────────────────────────────────
async function fetchRSSSource(source) {
  try {
    const res = await fetch(source.url, { 
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.warn(`[KnowledgeSync] Failed to fetch ${source.name}: HTTP ${res.status}`);
      return [];
    }
    const text = await res.text();
    const articles = parseRSS(text);
    return articles.map(a => ({ ...a, source: source.name }));
  } catch (e) {
    console.warn(`[KnowledgeSync] Error fetching ${source.name}:`, e.message);
    return [];
  }
}

async function fetchWikipedia() {
  try {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    const res = await fetch(`/api/wiki/featured/${yyyy}/${mm}/${dd}`, {
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn(`[KnowledgeSync] Failed to fetch Wikipedia: HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    const articles = parseWikipediaResponse(data);
    return articles.map(a => ({ ...a, source: WIKI_SOURCE.name }));
  } catch (e) {
    console.warn('[KnowledgeSync] Error fetching Wikipedia:', e.message);
    return [];
  }
}

// ─── Main Sync Function ──────────────────────────────────────
async function doSync(onProgress) {
  if (!navigator.onLine) {
    console.log('[KnowledgeSync] Offline, skipping sync');
    return { synced: 0, skipped: 0 };
  }

  // Check Qdrant availability
  const qdrantReady = await vectorDB.isHealthy();
  if (qdrantReady) {
    await vectorDB.ensureCollection();
    console.log('[KnowledgeSync] Qdrant ready');
  } else {
    console.warn('[KnowledgeSync] Qdrant not available, using IndexedDB only');
  }

  setSyncState({ status: 'syncing' });
  onProgress?.({ status: 'syncing', message: 'Memulai sync...' });

  let totalSynced = 0;
  let totalSkipped = 0;
  const batchForQdrant = [];

  // 1. Fetch RSS feeds
  for (const source of RSS_SOURCES) {
    try {
      onProgress?.({ status: 'syncing', message: `Fetching ${source.name}...` });
      const articles = await fetchRSSSource(source);

      for (const article of articles) {
        // Check di Qdrant dulu, fallback ke IndexedDB
        const existsInQdrant = qdrantReady
          ? await vectorDB.pointExists(article.title, article.source)
          : false;
        const existsInLocal = await knowledgeBase.exists(article.title, article.source);

        if (existsInQdrant || existsInLocal) {
          totalSkipped++;
          continue;
        }

        // Generate embedding
        const embedding = await generateEmbedding(`${article.title}. ${article.content}`);

        // Simpan ke IndexedDB (offline fallback)
        await knowledgeBase.addEntry({ ...article, embedding });

        // Batch untuk Qdrant
        if (embedding && qdrantReady) {
          batchForQdrant.push({
            id: `${article.source}_${article.title}`.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100),
            ...article,
            embedding,
          });
        }
        totalSynced++;
      }
    } catch (e) {
      console.error(`[KnowledgeSync] Error syncing ${source.name}:`, e);
    }
  }

  // 2. Fetch Wikipedia
  try {
    onProgress?.({ status: 'syncing', message: 'Fetching Wikipedia...' });
    const wikiArticles = await fetchWikipedia();

    for (const article of wikiArticles) {
      const existsInQdrant = qdrantReady
        ? await vectorDB.pointExists(article.title, article.source)
        : false;
      const existsInLocal = await knowledgeBase.exists(article.title, article.source);

      if (existsInQdrant || existsInLocal) {
        totalSkipped++;
        continue;
      }

      const embedding = await generateEmbedding(`${article.title}. ${article.content}`);

      await knowledgeBase.addEntry({ ...article, embedding });

      if (embedding && qdrantReady) {
        batchForQdrant.push({
          id: `${article.source}_${article.title}`.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100),
          ...article,
          embedding,
        });
      }
      totalSynced++;
    }
  } catch (e) {
    console.error('[KnowledgeSync] Error syncing Wikipedia:', e);
  }

  // 3. Batch upsert ke Qdrant
  if (batchForQdrant.length > 0 && qdrantReady) {
    onProgress?.({ status: 'syncing', message: `Menyimpan ${batchForQdrant.length} ke vector DB...` });
    await vectorDB.upsertPoints(batchForQdrant);
    console.log(`[KnowledgeSync] Upserted ${batchForQdrant.length} points to Qdrant`);
  }

  // 4. Cleanup old entries
  await knowledgeBase.cleanup();
  if (qdrantReady) {
    await vectorDB.deleteOldPoints(30);
  }

  setSyncState({
    status: 'synced',
    lastSync: new Date().toISOString(),
    lastResult: { synced: totalSynced, skipped: totalSkipped },
    qdrantReady,
  });

  onProgress?.({
    status: 'synced',
    message: `Sync selesai: ${totalSynced} baru, ${totalSkipped} sudah ada${qdrantReady ? ' (Qdrant ✓)' : ' (IndexedDB)'}`,
  });

  console.log(`[KnowledgeSync] Done: ${totalSynced} new, ${totalSkipped} skipped, Qdrant: ${qdrantReady}`);
  return { synced: totalSynced, skipped: totalSkipped };
}

// ─── Knowledge Sync Manager ──────────────────────────────────
class KnowledgeSyncManager {
  constructor() {
    this._intervalId = null;
    this._listeners = new Set();
    this._syncing = false;
  }

  // Subscribe to sync events
  onProgress(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  _notify(event) {
    this._listeners.forEach(cb => {
      try { cb(event); } catch {}
    });
  }

  // Start background sync
  start() {
    // Load knowledge base cache
    knowledgeBase.loadCache();

    // Online/offline listeners
    window.addEventListener('online', () => {
      console.log('[KnowledgeSync] Online — triggering sync');
      this._notify({ status: 'online', message: 'Koneksi tersambung' });
      this.syncNow();
    });

    window.addEventListener('offline', () => {
      console.log('[KnowledgeSync] Offline');
      this._notify({ status: 'offline', message: 'Mode offline' });
    });

    // Initial sync after short delay (let app load first)
    if (navigator.onLine) {
      const state = getSyncState();
      const timeSinceLastSync = state.lastSync
        ? Date.now() - new Date(state.lastSync).getTime()
        : Infinity;

      // Sync if never synced or last sync is older than interval
      if (timeSinceLastSync >= SYNC_INTERVAL) {
        setTimeout(() => this.syncNow(), 5000);
      } else {
        console.log('[KnowledgeSync] Recent sync exists, skipping initial sync');
      }
    }

    // Periodic sync
    this._intervalId = setInterval(() => {
      if (navigator.onLine) {
        this.syncNow();
      }
    }, SYNC_INTERVAL);

    console.log('[KnowledgeSync] Manager started');
  }

  // Trigger sync now
  async syncNow() {
    if (this._syncing) {
      console.log('[KnowledgeSync] Already syncing, skipping');
      return;
    }

    this._syncing = true;
    try {
      await doSync((event) => this._notify(event));
    } catch (e) {
      console.error('[KnowledgeSync] Sync error:', e);
      this._notify({ status: 'error', message: 'Sync gagal: ' + e.message });
    } finally {
      this._syncing = false;
    }
  }

  // Stop background sync
  stop() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    console.log('[KnowledgeSync] Manager stopped');
  }

  // Get current state
  async getState() {
    const qdrantInfo = await vectorDB.getCollectionInfo();
    return {
      ...getSyncState(),
      isOnline: navigator.onLine,
      isSyncing: this._syncing,
      localStats: knowledgeBase.getStats(),
      qdrantStats: qdrantInfo,
    };
  }
}

// Singleton
export const knowledgeSyncManager = new KnowledgeSyncManager();
export default knowledgeSyncManager;
