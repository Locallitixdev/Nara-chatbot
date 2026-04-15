import { useState } from "react";
import SystemMonitor from "./SystemMonitor";
import "./SettingsView.css";

export default function SettingsView({
  selectedModel,
  availableModels,
  onModelChange,
  connectionStatus,
  onReconnect,
  theme,
  onToggleTheme,
}) {
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);

  const isConnected = connectionStatus === 'connected';

  const getStatusLabel = () => {
    switch (connectionStatus) {
      case 'connected':
        return { text: 'Terhubung', class: 'success' };
      case 'connecting':
        return { text: 'Menghubungkan...', class: 'warning' };
      default:
        return { text: 'Terputus', class: 'error' };
    }
  };

  const statusLabel = getStatusLabel();

  return (
    <div className="settings-view">
      <header className="view-header">
        <div className="header-content">
          <h2>Pengaturan</h2>
          <p>Konfigurasi NARA sesuai kebutuhan</p>
        </div>
      </header>

      <div className="settings-content">
        <section className="settings-section">
          <SystemMonitor />
        </section>

        <section className="settings-section">
          <h3 className="section-title">Koneksi Ollama</h3>
          <div className="connection-card">
            <div className="connection-status">
              <span className={`status-dot ${statusLabel.class}`} />
              <span className="status-text">{statusLabel.text}</span>
            </div>
            {!isConnected && (
              <button className="reconnect-btn" onClick={onReconnect}>
                Hubungkan ulang
              </button>
            )}
          </div>
        </section>

        <section className="settings-section">
          <h3 className="section-title">Model AI</h3>
          <p className="section-desc">Model yang tersedia dari Ollama</p>

          <div className="model-list">
            {availableModels.length > 0 ? (
              availableModels.map((model, i) => {
                const modelName = typeof model === 'string' ? model : model.name;
                const isSelected = selectedModel === modelName;

                return (
                  <button
                    key={i}
                    className={`model-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => onModelChange(modelName)}
                    disabled={!isConnected}
                  >
                    <div className="model-item-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                    </div>
                    <div className="model-item-info">
                      <span className="model-item-name">{modelName}</span>
                    </div>
                    {isSelected && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="no-models">
                <p>
                  {isConnected
                    ? 'Tidak ada model tersedia'
                    : 'Hubungkan Ollama untuk melihat model'}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="settings-section">
          <h3 className="section-title">Parameter Generasi</h3>
          <p className="section-desc">Atur kreativitas dan panjang respons</p>

          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-label">Temperature</span>
              <span className="setting-value">{temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="range-input"
            />
            <div className="setting-hints">
              <span>Deterministik</span>
              <span>Kreatif</span>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-label">Max Tokens</span>
              <span className="setting-value">{maxTokens}</span>
            </div>
            <input
              type="range"
              min="256"
              max="4096"
              step="256"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="range-input"
            />
            <div className="setting-hints">
              <span>Singkat</span>
              <span>Panjang</span>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h3 className="section-title">Tampilan</h3>
          <div className="theme-toggle-card">
            <div className="theme-info">
              <div className="theme-icon">
                {theme === 'dark' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                )}
              </div>
              <div>
                <span className="theme-label">Mode {theme === 'dark' ? 'Gelap' : 'Terang'}</span>
                <span className="theme-desc">Sesuaikan tampilan aplikasi</span>
              </div>
            </div>
            <button
              className={`theme-toggle-btn ${theme === 'dark' ? 'on' : ''}`}
              onClick={onToggleTheme}
            >
              <span className="toggle-track">
                <span className="toggle-thumb" />
              </span>
            </button>
          </div>
        </section>

        <section className="settings-section">
          <h3 className="section-title">Tentang NARA</h3>
          <div className="about-info">
            <div className="about-row">
              <span>Versi</span>
              <span>1.0.0-beta</span>
            </div>
            <div className="about-row">
              <span>Stack</span>
              <span>React + Tauri + Ollama</span>
            </div>
            <div className="about-row">
              <span>Privacy</span>
              <span className="badge success">100% Lokal</span>
            </div>
            <div className="about-row">
              <span>Tema</span>
              <span className="badge">{theme === 'dark' ? '🌙 Gelap' : '☀️ Terang'}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
