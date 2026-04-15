import { useState, useEffect, useCallback } from "react";
import { getOpenClawStatus, listAutomations, toggleAutomation } from "../../services/openclaw";
import "./AutomationsView.css";

const DEFAULT_AUTOMATIONS = [
  {
    id: "wa-reply",
    name: "Auto-reply WhatsApp",
    description: "Balas pesan WhatsApp secara otomatis dengan info produk",
    enabled: false,
    icon: "message",
  },
  {
    id: "email-digest",
    name: "Ringkasan Email Harian",
    description: "Kirim ringkasan email penting setiap pagi",
    enabled: false,
    icon: "mail",
  },
  {
    id: "doc-organize",
    name: "Organisir Dokumen",
    description: "Otomatis kategorikan dan arsipkan file masuk",
    enabled: false,
    icon: "folder",
  },
];

const icons = {
  message: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  mail: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  folder: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
};

export default function AutomationsView() {
  const [automations, setAutomations] = useState(DEFAULT_AUTOMATIONS);
  const [openclawStatus, setOpenclawStatus] = useState({ running: false });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check OpenClaw status on mount
  useEffect(() => {
    checkStatus();
    const timer = setInterval(checkStatus, 10000); // re-check every 10s
    return () => clearInterval(timer);
  }, []);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      const status = await getOpenClawStatus();
      setOpenclawStatus(status);

      // If connected, fetch real automations
      if (status.running) {
        const data = await listAutomations();
        if (Array.isArray(data) && data.length > 0) {
          setAutomations(data);
        }
      }
    } catch {}
    setChecking(false);
  }, []);

  const handleToggle = async (id) => {
    const automation = automations.find(a => a.id === id);
    if (!automation) return;

    setLoading(true);
    try {
      await toggleAutomation(id, !automation.enabled);
      setAutomations(prev => prev.map(a => 
        a.id === id ? { ...a, enabled: !a.enabled } : a
      ));
    } catch {
      // Toggle locally even if API fails (for demo)
      setAutomations(prev => prev.map(a => 
        a.id === id ? { ...a, enabled: !a.enabled } : a
      ));
    }
    setLoading(false);
  };

  const activeCount = automations.filter(a => a.enabled).length;

  return (
    <div className="automations-view">
      <header className="view-header">
        <div className="header-content">
          <h2>Automasi</h2>
          <p>{activeCount} automasi aktif · OpenClaw {openclawStatus.running ? 'terhubung' : 'tidak terhubung'}</p>
        </div>
      </header>

      <div className="automations-content">
        {/* OpenClaw status card */}
        <div className={`openclaw-status ${openclawStatus.running ? 'connected' : 'disconnected'}`}>
          <div className="status-header">
            <div className="status-info">
              <span className={`status-dot ${openclawStatus.running ? 'active' : ''}`} />
              <span className="status-name">OpenClaw Agent</span>
              <span className={`status-badge ${openclawStatus.running ? 'success' : 'inactive'}`}>
                {checking ? 'Memeriksa...' : openclawStatus.running ? 'Aktif' : 'Tidak Aktif'}
              </span>
            </div>
            <button className="status-refresh" onClick={checkStatus} disabled={checking}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>
          </div>
          {openclawStatus.running ? (
            <p className="status-detail">
              Agent berjalan di <code>127.0.0.1:7654</code>
              {openclawStatus.pid && <> · PID: {openclawStatus.pid}</>}
            </p>
          ) : (
            <p className="status-detail">
              Jalankan <code>openclaw serve</code> untuk mengaktifkan automasi
            </p>
          )}
        </div>

        {/* Automations list */}
        <div className="automations-list">
          {automations.map((automation, i) => (
            <div 
              key={automation.id} 
              className={`automation-item ${automation.enabled ? "enabled" : ""}`}
              style={{ "--i": i }}
            >
              <div className="automation-icon">
                {icons[automation.icon] || icons.folder}
              </div>

              <div className="automation-info">
                <span className="automation-name">{automation.name}</span>
                <span className="automation-desc">{automation.description}</span>
              </div>

              <button 
                className={`automation-toggle ${automation.enabled ? "on" : ""}`}
                onClick={() => handleToggle(automation.id)}
                disabled={loading}
              >
                <span className="toggle-track">
                  <span className="toggle-thumb" />
                </span>
              </button>
            </div>
          ))}
        </div>

        {/* Feature coming soon notice */}
        {!openclawStatus.running && (
          <div className="coming-soon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" />
              <path d="M12 6v6l4 2" />
            </svg>
            <div>
              <span className="coming-title">OpenClaw belum terinstall?</span>
              <span className="coming-desc">Install OpenClaw untuk mengaktifkan automasi WhatsApp, Email, dan tugas otomatis lainnya.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
