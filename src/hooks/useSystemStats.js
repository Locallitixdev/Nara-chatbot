import { useState, useEffect, useCallback, useRef } from 'react';

// Check if running inside Tauri
const isTauri = () => typeof window.__TAURI__ !== 'undefined';

/**
 * System stats hook — uses Tauri native commands when available,
 * falls back to browser Performance API in dev mode.
 */
export function useSystemStats(interval = 3000) {
  const [stats, setStats] = useState({
    cpu: { usage: 0, cores: navigator.hardwareConcurrency || 0 },
    memory: { used: 0, total: 0, percent: 0 },
    gpu: { name: 'Tidak terdeteksi', usage: 0 },
    ollama: { running: false, model: null, vram: 0 },
    uptime: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef(null);
  const prevCpuRef = useRef(null);

  // ─── Browser fallback stats ──────────────────────────────────
  const getBrowserStats = useCallback(async () => {
    const now = performance.now();
    
    // CPU estimate via performance timing
    let cpuUsage = 0;
    if (prevCpuRef.current) {
      const entries = performance.getEntriesByType('measure');
      cpuUsage = Math.min(entries.length * 2, 100); // rough estimate
    }
    prevCpuRef.current = now;

    // Memory (only available in Chrome)
    let memUsed = 0, memTotal = 0, memPercent = 0;
    if (performance.memory) {
      memUsed = performance.memory.usedJSHeapSize;
      memTotal = performance.memory.jsHeapSizeLimit;
      memPercent = Math.round((memUsed / memTotal) * 100);
    } else if (navigator.deviceMemory) {
      memTotal = navigator.deviceMemory * 1024 * 1024 * 1024; // GB → bytes
      memUsed = memTotal * 0.5; // estimate
      memPercent = 50;
    }

    // GPU detection via WebGL
    let gpuName = 'Tidak terdeteksi';
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          gpuName = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown';
        }
      }
    } catch {}

    return {
      cpu: {
        usage: cpuUsage,
        cores: navigator.hardwareConcurrency || 0,
      },
      memory: {
        used: memUsed,
        total: memTotal,
        percent: memPercent,
      },
      gpu: {
        name: gpuName,
        usage: 0, // can't measure GPU usage from browser
      },
      ollama: {
        running: false,
        model: null,
        vram: 0,
      },
      uptime: Math.floor(now / 1000),
    };
  }, []);

  // ─── Tauri native stats ──────────────────────────────────────
  const getTauriStats = useCallback(async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke('get_system_stats');
      return result;
    } catch (err) {
      console.warn('Tauri system stats failed, using browser fallback:', err);
      return getBrowserStats();
    }
  }, [getBrowserStats]);

  // ─── Check Ollama status ─────────────────────────────────────
  const checkOllama = useCallback(async () => {
    try {
      const res = await fetch('/api/ollama/api/tags', { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        const models = data.models || [];
        return {
          running: true,
          model: models.length > 0 ? models[0].name : null,
          modelCount: models.length,
          vram: models.reduce((sum, m) => sum + (m.size || 0), 0),
        };
      }
    } catch {}
    return { running: false, model: null, modelCount: 0, vram: 0 };
  }, []);

  // ─── Poll stats ──────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const [sysStats, ollamaStats] = await Promise.all([
        isTauri() ? getTauriStats() : getBrowserStats(),
        checkOllama(),
      ]);

      setStats(prev => ({
        ...sysStats,
        ollama: ollamaStats,
      }));
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to get system stats:', err);
      setIsLoading(false);
    }
  }, [getTauriStats, getBrowserStats, checkOllama]);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, interval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh, interval]);

  return { stats, isLoading, refresh };
}
