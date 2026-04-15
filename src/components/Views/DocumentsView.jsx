import { useState, useCallback, useEffect, useRef } from "react";
import { extractPdfPreview, extractPdfText } from "../../services/pdfReader";
import { vectorStore } from "../../services/rag";
import "./DocumentsView.css";

const DOCS_METADATA_KEY = 'nara_docs_metadata';

export default function DocumentsView({ docs = [], setDocs }) {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [indexProgress, setIndexProgress] = useState({ current: 0, total: 0 });
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Load saved metadata
  useEffect(() => {
    const savedMeta = localStorage.getItem(DOCS_METADATA_KEY);
    if (savedMeta && docs.length === 0) {
      try {
        const meta = JSON.parse(savedMeta);
        setDocs(meta);
      } catch (e) {
        console.error('Failed to load docs metadata:', e);
      }
    }
  }, [setDocs]);

  // Persist metadata
  useEffect(() => {
    if (docs.length > 0) {
      const meta = docs.map(d => ({
        id: d.id || d.path,
        name: d.name,
        path: d.path,
        size: d.size,
        modified: d.modified,
        indexed: d.indexed,
        active: d.active !== undefined ? d.active : false,
        chunkCount: d.chunkCount || 0,
      }));
      localStorage.setItem(DOCS_METADATA_KEY, JSON.stringify(meta));
    } else {
      localStorage.removeItem(DOCS_METADATA_KEY);
    }
  }, [docs]);

  // Auto-dismiss notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // ─── File handling ────────────────────────────────────────────
  const processFiles = useCallback((files) => {
    const docList = files.map(file => ({
      id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      path: file.name,
      size: file.size,
      modified: file.lastModified,
      file: file,
      indexed: false,
      active: false,
      chunkCount: 0,
    }));
    
    setDocs(prev => {
      const existingNames = new Set(prev.map(d => d.name));
      const newDocs = docList.filter(d => !existingNames.has(d.name));
      if (newDocs.length === 0) {
        setNotification({ type: 'info', text: 'Dokumen sudah ada' });
        return prev;
      }
      setNotification({ type: 'success', text: `${newDocs.length} dokumen ditambahkan` });
      return [...prev, ...newDocs];
    });
    setError(null);
  }, [setDocs]);

  const handleFileSelect = useCallback((e) => {
    processFiles(Array.from(e.target.files));
    e.target.value = ''; // reset so same file can be re-selected
  }, [processFiles]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ['pdf', 'txt', 'md'].includes(ext);
    });
    if (files.length > 0) processFiles(files);
  }, [processFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  // ─── Document actions ─────────────────────────────────────────
  const handleSelectDocument = useCallback(async (doc) => {
    setSelectedDoc(doc);
    setLoading(true);
    setPreview(null);
    
    try {
      if (doc.file) {
        const ext = doc.name.split('.').pop()?.toLowerCase();
        
        if (ext === 'pdf') {
          const text = await extractPdfPreview(doc.file);
          setPreview(text);
        } else if (ext === 'txt' || ext === 'md') {
          const text = await doc.file.text();
          setPreview(text.substring(0, 5000));
        } else {
          setError('Format tidak didukung: ' + ext);
        }
      } else {
        setPreview('File tidak tersedia di memory. Index ulang untuk menggunakan di RAG.');
      }
    } catch (err) {
      console.error('Failed to load preview:', err);
      setError('Gagal memuat pratinjau dokumen');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleIndex = useCallback(async (doc) => {
    if (!doc.file) {
      setError('File tidak tersedia. Silakan pilih ulang dokumen terlebih dahulu.');
      return;
    }
    
    setIndexing(true);
    setError(null);
    setIndexProgress({ current: 0, total: 0 });
    
    try {
      const ext = doc.name.split('.').pop()?.toLowerCase();
      let content;
      
      if (ext === 'pdf') {
        setNotification({ type: 'info', text: 'Mengekstrak teks dari PDF...' });
        content = await extractPdfText(doc.file);
      } else if (ext === 'txt' || ext === 'md') {
        content = await doc.file.text();
      } else {
        throw new Error('Format tidak didukung');
      }
      
      if (!content || content.trim().length === 0) {
        throw new Error('Dokumen kosong atau tidak bisa dibaca');
      }

      setNotification({ type: 'info', text: 'Membuat embeddings...' });
      const chunkCount = await vectorStore.addDocument(
        doc.id || doc.path,
        doc.name,
        content
      );
      
      setDocs(prev => prev.map(d => 
        (d.id || d.path) === (doc.id || doc.path)
          ? { ...d, indexed: true, active: true, chunkCount }
          : d
      ));
      
      setNotification({ type: 'success', text: `✓ ${chunkCount} chunks diindeks dari "${doc.name}"` });
    } catch (err) {
      console.error('Failed to index document:', err);
      setError('Gagal mengindeks dokumen: ' + err.message);
    } finally {
      setIndexing(false);
      setIndexProgress({ current: 0, total: 0 });
    }
  }, [setDocs]);

  const handleToggleActive = useCallback((docId) => {
    setDocs(prev => prev.map(d =>
      (d.id || d.path) === docId
        ? { ...d, active: !d.active }
        : d
    ));
  }, [setDocs]);

  const handleRemoveDoc = useCallback((docId) => {
    setDocs(prev => prev.filter(d => (d.id || d.path) !== docId));
    vectorStore.removeDocument(docId);
    if ((selectedDoc?.id || selectedDoc?.path) === docId) {
      setSelectedDoc(null);
      setPreview(null);
    }
    setNotification({ type: 'info', text: 'Dokumen dihapus' });
  }, [selectedDoc, setDocs]);

  // ─── Helpers ──────────────────────────────────────────────────
  const formatSize = (bytes) => {
    if (!bytes) return '?';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const activeCount = docs.filter(d => d.active).length;
  const indexedCount = docs.filter(d => d.indexed).length;

  return (
    <div
      className={`documents-view ${dragOver ? 'drag-over' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Notification toast */}
      {notification && (
        <div className={`doc-toast ${notification.type}`}>
          {notification.text}
        </div>
      )}

      <header className="view-header">
        <div className="header-content">
          <h2>Dokumen Lokal</h2>
          <p>
            {docs.length > 0
              ? `${docs.length} dokumen · ${indexedCount} terindeks · ${activeCount} aktif untuk RAG`
              : 'Tambah dan index dokumen untuk RAG (Retrieval-Augmented Generation)'
            }
          </p>
        </div>
        <button 
          className="add-doc-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Tambah Dokumen
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md"
          multiple
          onChange={handleFileSelect}
          hidden
        />
      </header>

      {/* Drag overlay */}
      {dragOver && (
        <div className="drag-overlay">
          <div className="drag-content">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p>Lepas file untuk menambahkan</p>
          </div>
        </div>
      )}

      <div className="documents-layout">
        <aside className="documents-sidebar">
          {error && (
            <div className="error-message">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
              <button className="dismiss-btn" onClick={() => setError(null)}>×</button>
            </div>
          )}

          <div className="docs-list">
            {docs.length === 0 ? (
              <div className="empty-state small">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <p>Belum ada dokumen.</p>
                <p className="hint">Drag & drop atau klik "Tambah Dokumen"</p>
              </div>
            ) : (
              docs.map((doc, i) => (
                <div
                  key={doc.id || doc.path}
                  className={`doc-item ${(selectedDoc?.id || selectedDoc?.path) === (doc.id || doc.path) ? 'active' : ''} ${doc.indexed ? 'indexed' : ''}`}
                  onClick={() => handleSelectDocument(doc)}
                  style={{ "--i": i }}
                >
                  {/* Active toggle */}
                  {doc.indexed && (
                    <button
                      className={`doc-toggle ${doc.active ? 'on' : 'off'}`}
                      onClick={(e) => { e.stopPropagation(); handleToggleActive(doc.id || doc.path); }}
                      title={doc.active ? 'Nonaktifkan dari RAG' : 'Aktifkan untuk RAG'}
                    >
                      <div className="toggle-track">
                        <div className="toggle-thumb" />
                      </div>
                    </button>
                  )}

                  <div className="doc-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="doc-info">
                    <span className="doc-name" title={doc.name}>{doc.name}</span>
                    <span className="doc-meta">
                      {formatSize(doc.size)}
                      {doc.indexed
                        ? ` · ${doc.chunkCount || '?'} chunks · ${doc.active ? '🟢 Aktif' : '⚪ Nonaktif'}`
                        : ' · Belum terindeks'
                      }
                    </span>
                  </div>
                  <button 
                    className="doc-remove"
                    onClick={(e) => { e.stopPropagation(); handleRemoveDoc(doc.id || doc.path); }}
                    title="Hapus"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        <main className="documents-main">
          {selectedDoc ? (
            <>
              <div className="doc-preview-header">
                <div className="doc-preview-title">
                  <h3>{selectedDoc.name}</h3>
                  <span className="doc-meta">
                    {formatSize(selectedDoc.size)} · {formatDate(selectedDoc.modified)}
                    {selectedDoc.indexed && ` · ${selectedDoc.chunkCount || '?'} chunks`}
                  </span>
                </div>
                <div className="doc-preview-actions">
                  <button
                    className={`action-btn ${selectedDoc.indexed ? 'indexed' : 'primary'}`}
                    onClick={() => handleIndex(selectedDoc)}
                    disabled={indexing || selectedDoc.indexed}
                  >
                    {indexing ? (
                      <>
                        <div className="btn-spinner" />
                        Mengindeks...
                      </>
                    ) : selectedDoc.indexed ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Terindeks
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Index ke RAG
                      </>
                    )}
                  </button>

                  {selectedDoc.indexed && (
                    <button
                      className={`action-btn toggle ${selectedDoc.active ? 'active' : ''}`}
                      onClick={() => handleToggleActive(selectedDoc.id || selectedDoc.path)}
                    >
                      {selectedDoc.active ? '🟢 Aktif di RAG' : '⚪ Nonaktif'}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="doc-preview-content">
                {selectedDoc.file ? (
                  <>
                    {loading ? (
                      <div className="loading-preview">
                        <div className="spinner" />
                        <p>Memuat pratinjau...</p>
                      </div>
                    ) : preview ? (
                      <pre className="preview-text">{preview}</pre>
                    ) : (
                      <p className="no-preview">Pratinjau tidak tersedia</p>
                    )}
                  </>
                ) : (
                  <div className="file-re-select">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <p>File tidak tersedia di browser.</p>
                    <p className="hint">Dokumen sudah terindeks dan bisa digunakan untuk RAG.</p>
                    {!selectedDoc.indexed && (
                      <button 
                        className="action-btn primary"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Pilih Ulang Dokumen
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-selection">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p>Pilih dokumen untuk melihat pratinjau</p>
              <p className="hint">Dokumen yang diindeks dan aktif akan digunakan saat chat untuk konteks RAG</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
