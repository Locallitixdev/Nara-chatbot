// ─── Vector DB Service — Qdrant REST Client ──────────────────
// Client untuk Qdrant vector database via REST API
// Digunakan oleh knowledgeSync untuk simpan & search knowledge

const QDRANT_BASE = '/api/vectors';
const COLLECTION_NAME = 'nara_knowledge';
const VECTOR_SIZE = 768; // nomic-embed-text output dimension

// ─── Collection Management ───────────────────────────────────
async function ensureCollection() {
  try {
    // Cek apakah collection sudah ada
    const res = await fetch(`${QDRANT_BASE}/collections/${COLLECTION_NAME}`);
    if (res.ok) return true;

    // Buat collection baru
    const createRes = await fetch(`${QDRANT_BASE}/collections/${COLLECTION_NAME}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine',
        },
        optimizers_config: {
          default_segment_number: 2,
        },
        replication_factor: 1,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      console.error('[VectorDB] Failed to create collection:', err);
      return false;
    }

    console.log('[VectorDB] Collection created:', COLLECTION_NAME);
    return true;
  } catch (e) {
    console.error('[VectorDB] ensureCollection error:', e);
    return false;
  }
}

// ─── Upsert Points ───────────────────────────────────────────
async function upsertPoints(points) {
  try {
    await ensureCollection();

    const res = await fetch(`${QDRANT_BASE}/collections/${COLLECTION_NAME}/points`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        points: points.map((p, idx) => ({
          id: hashStringToInt(p.id || `point_${Date.now()}_${idx}`),
          vector: p.embedding,
          payload: {
            original_id: p.id,
            title: p.title,
            content: p.content,
            source: p.source,
            sourceUrl: p.sourceUrl || '',
            date: p.date,
            syncedAt: new Date().toISOString(),
          },
        })),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[VectorDB] Upsert failed:', err);
      return false;
    }

    return true;
  } catch (e) {
    console.error('[VectorDB] upsertPoints error:', e);
    return false;
  }
}

// ─── Search Similar Vectors ──────────────────────────────────
async function searchSimilar(queryVector, topK = 5, scoreThreshold = 0.35) {
  try {
    const res = await fetch(`${QDRANT_BASE}/collections/${COLLECTION_NAME}/points/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vector: queryVector,
        limit: topK,
        score_threshold: scoreThreshold,
        with_payload: true,
      }),
    });

    if (!res.ok) {
      console.error('[VectorDB] Search failed:', res.status);
      return [];
    }

    const data = await res.json();
    return (data.result || []).map(r => ({
      id: r.payload?.original_id || r.id,
      title: r.payload?.title || '',
      content: r.payload?.content || '',
      source: r.payload?.source || '',
      sourceUrl: r.payload?.sourceUrl || '',
      date: r.payload?.date || '',
      score: r.score,
    }));
  } catch (e) {
    console.error('[VectorDB] searchSimilar error:', e);
    return [];
  }
}

// ─── Get Collection Info ─────────────────────────────────────
async function getCollectionInfo() {
  try {
    const res = await fetch(`${QDRANT_BASE}/collections/${COLLECTION_NAME}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      pointsCount: data.result?.points_count || 0,
      vectorsCount: data.result?.vectors_count || 0,
      status: data.result?.status || 'unknown',
    };
  } catch {
    return null;
  }
}

// ─── Delete Old Points ───────────────────────────────────────
async function deleteOldPoints(daysOld = 30) {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    const res = await fetch(`${QDRANT_BASE}/collections/${COLLECTION_NAME}/points/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filter: {
          must: [{
            key: 'syncedAt',
            range: {
              lt: cutoff.toISOString(),
            },
          }],
        },
      }),
    });

    if (res.ok) {
      console.log('[VectorDB] Old points deleted');
    }
  } catch (e) {
    console.error('[VectorDB] deleteOldPoints error:', e);
  }
}

// ─── Check If Point Exists ───────────────────────────────────
async function pointExists(title, source) {
  try {
    const res = await fetch(`${QDRANT_BASE}/collections/${COLLECTION_NAME}/points/scroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filter: {
          must: [
            { key: 'title', match: { value: title } },
            { key: 'source', match: { value: source } },
          ],
        },
        limit: 1,
        with_payload: false,
      }),
    });

    if (!res.ok) return false;
    const data = await res.json();
    return (data.result?.points?.length || 0) > 0;
  } catch {
    return false;
  }
}

// ─── Health Check ────────────────────────────────────────────
async function isHealthy() {
  try {
    const res = await fetch(`${QDRANT_BASE}/healthz`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Hash String to Integer (for Qdrant point ID) ────────────
function hashStringToInt(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// ─── Exports ─────────────────────────────────────────────────
export const vectorDB = {
  ensureCollection,
  upsertPoints,
  searchSimilar,
  getCollectionInfo,
  deleteOldPoints,
  pointExists,
  isHealthy,
};

export default vectorDB;
