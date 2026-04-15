import { useSystemStats } from "../../hooks/useSystemStats";
import "./SystemMonitor.css";

export default function SystemMonitor() {
  const { stats, isLoading, refresh } = useSystemStats(3000);

  const formatBytes = (bytes) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(0) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  };

  const formatUptime = (seconds) => {
    if (!seconds) return "–";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}j ${m}m`;
    return `${m}m`;
  };

  const getUsageColor = (percent) => {
    if (percent > 85) return "critical";
    if (percent > 60) return "warning";
    return "normal";
  };

  if (isLoading) {
    return (
      <div className="system-monitor loading">
        <div className="monitor-spinner" />
        <span>Memuat info sistem...</span>
      </div>
    );
  }

  return (
    <div className="system-monitor">
      <div className="monitor-header">
        <h4>Monitor Sistem</h4>
        <button className="refresh-btn" onClick={refresh} title="Refresh">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
      </div>

      <div className="monitor-grid">
        {/* CPU */}
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon cpu">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <rect x="9" y="9" width="6" height="6" />
                <line x1="9" y1="1" x2="9" y2="4" />
                <line x1="15" y1="1" x2="15" y2="4" />
                <line x1="9" y1="20" x2="9" y2="23" />
                <line x1="15" y1="20" x2="15" y2="23" />
                <line x1="20" y1="9" x2="23" y2="9" />
                <line x1="20" y1="14" x2="23" y2="14" />
                <line x1="1" y1="9" x2="4" y2="9" />
                <line x1="1" y1="14" x2="4" y2="14" />
              </svg>
            </div>
            <span className="stat-label">CPU</span>
          </div>
          <div className="stat-value-row">
            <span className={`stat-value ${getUsageColor(stats.cpu.usage)}`}>
              {stats.cpu.usage > 0 ? `${Math.round(stats.cpu.usage)}%` : "–"}
            </span>
            <span className="stat-detail">{stats.cpu.cores} cores</span>
          </div>
          <div className="stat-bar">
            <div
              className={`stat-bar-fill ${getUsageColor(stats.cpu.usage)}`}
              style={{ width: `${stats.cpu.usage}%` }}
            />
          </div>
        </div>

        {/* Memory */}
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon memory">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <line x1="6" y1="10" x2="6" y2="14" />
                <line x1="10" y1="10" x2="10" y2="14" />
                <line x1="14" y1="10" x2="14" y2="14" />
                <line x1="18" y1="10" x2="18" y2="14" />
              </svg>
            </div>
            <span className="stat-label">Memory</span>
          </div>
          <div className="stat-value-row">
            <span className={`stat-value ${getUsageColor(stats.memory.percent)}`}>
              {stats.memory.percent > 0 ? `${stats.memory.percent}%` : "–"}
            </span>
            <span className="stat-detail">
              {stats.memory.total > 0
                ? `${formatBytes(stats.memory.used)} / ${formatBytes(stats.memory.total)}`
                : "N/A"
              }
            </span>
          </div>
          <div className="stat-bar">
            <div
              className={`stat-bar-fill ${getUsageColor(stats.memory.percent)}`}
              style={{ width: `${stats.memory.percent}%` }}
            />
          </div>
        </div>

        {/* GPU */}
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon gpu">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <span className="stat-label">GPU</span>
          </div>
          <div className="stat-value-row">
            <span className="stat-value">
              {stats.gpu.usage > 0 ? `${Math.round(stats.gpu.usage)}%` : "–"}
            </span>
            <span className="stat-detail gpu-name" title={stats.gpu.name}>
              {stats.gpu.name || "Tidak terdeteksi"}
            </span>
          </div>
          <div className="stat-bar">
            <div
              className="stat-bar-fill"
              style={{ width: `${stats.gpu.usage}%` }}
            />
          </div>
        </div>

        {/* Ollama */}
        <div className="stat-card">
          <div className="stat-header">
            <div className={`stat-icon ollama ${stats.ollama.running ? "active" : ""}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="stat-label">Ollama</span>
          </div>
          <div className="stat-value-row">
            <span className={`stat-value ${stats.ollama.running ? "normal" : "critical"}`}>
              {stats.ollama.running ? "Aktif" : "Mati"}
            </span>
            <span className="stat-detail">
              {stats.ollama.running
                ? `${stats.ollama.modelCount || 0} model`
                : "Tidak berjalan"
              }
            </span>
          </div>
          {stats.ollama.running && stats.ollama.vram > 0 && (
            <div className="stat-extra">
              VRAM: {formatBytes(stats.ollama.vram)}
            </div>
          )}
        </div>
      </div>

      <div className="monitor-footer">
        <span className="uptime-label">
          Uptime: {formatUptime(stats.uptime)}
        </span>
        <span className="refresh-hint">
          Auto-refresh setiap 3 detik
        </span>
      </div>
    </div>
  );
}
