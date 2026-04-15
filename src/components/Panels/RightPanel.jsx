import { useState } from "react";
import "./RightPanel.css";

export default function RightPanel({
  selectedModel,
  availableModels,
  onModelChange,
  connectionStatus,
  onReconnect,
  error,
}) {
  const [collapsed, setCollapsed] = useState(false);

  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return { label: 'Terhubung', class: 'connected', icon: '●' };
      case 'connecting':
        return { label: 'Menghubungkan...', class: 'connecting', icon: '◐' };
      case 'disconnected':
      default:
        return { label: 'Terputus', class: 'disconnected', icon: '○' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <aside className={`right-panel ${collapsed ? "collapsed" : ""}`}>
      <button
        className="collapse-btn"
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? "Tampilkan panel" : "Sembunyikan panel"}
        aria-label={collapsed ? "Tampilkan panel" : "Sembunyikan panel"}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {collapsed ? (
            <path d="M9 18l6-6-6-6" />
          ) : (
            <path d="M15 18l-6-6 6-6" />
          )}
        </svg>
      </button>

      <div className="panel-content" style={{ paddingTop: '16px' }}>
        <div className="panel-section">
          <h3 className="section-title">Status</h3>
          <div className="status-card">
            <div className="status-row">
              <span className={`status-indicator ${statusInfo.class}`}>
                {statusInfo.icon}
              </span>
              <span className="status-label">Ollama</span>
              <span className={`status-badge ${statusInfo.class}`}>
                {statusInfo.label}
              </span>
            </div>
            {connectionStatus === 'disconnected' && (
              <button
                className="reconnect-btn"
                onClick={onReconnect}
              >
                Hubungkan ulang
              </button>
            )}
            {error && (
              <p className="error-text">{error}</p>
            )}
          </div>
        </div>

        <div className="panel-section">
          <h3 className="section-title">Model AI</h3>
          <div className="model-selector">
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="model-select"
              disabled={connectionStatus !== 'connected'}
            >
              {availableModels.length > 0 ? (
                availableModels.map((m, i) => (
                  <option key={i} value={typeof m === 'string' ? m : m.name}>
                    {typeof m === 'string' ? m : m.name}
                  </option>
                ))
              ) : (
                <option value="">Memuat model...</option>
              )}
            </select>

            <div className="model-info">
              {selectedModel ? (
                <>
                  <span className="model-desc">Model aktif</span>
                  <span className="model-size">{selectedModel}</span>
                </>
              ) : (
                <span className="text-muted">
                  {connectionStatus === 'connected'
                    ? 'Tidak ada model'
                    : 'Hubungkan Ollama dulu'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="panel-section">
          <h3 className="section-title">Info</h3>
          <div className="integration-list">
            <div className="integration-item">
              <div className={`integration-icon ${connectionStatus === 'connected' ? 'active' : ''}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="integration-info">
                <span className="integration-name">Ollama</span>
                <span className={`integration-status ${connectionStatus === 'connected' ? 'active' : ''}`}>
                  {connectionStatus === 'connected' ? 'Aktif' : connectionStatus === 'connecting' ? 'Menghubungkan...' : 'Terputus'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="panel-footer">
          <p className="privacy-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Semua data diproses secara lokal
          </p>
        </div>
      </div>
    </aside>
  );
}
