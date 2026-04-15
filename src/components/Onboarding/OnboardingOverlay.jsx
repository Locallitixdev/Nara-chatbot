import { useState, useEffect } from "react";
import "./OnboardingOverlay.css";

const SETUP_STEPS = [
  { id: "check", label: "Memeriksa koneksi", desc: "Cek status Ollama" },
  { id: "connect", label: "Menghubungkan", desc: "Koneksi ke Ollama" },
  { id: "ready", label: "Sistem siap", desc: "NARA siap digunakan" },
];

export default function OnboardingOverlay({ onComplete, onConnect, connectionStatus }) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    if (step !== 1) return;

    let currentProgress = 0;
    const steps = [
      { delay: 500, progress: 1 },
      { delay: 1500, progress: 2 },
      { delay: 3000, progress: 3 },
    ];

    const timers = steps.map(({ delay, progress }) =>
      setTimeout(() => {
        setProgress(progress);
        if (progress === 1) {
          onConnect?.();
        }
      }, delay)
    );

    return () => timers.forEach(clearTimeout);
  }, [step, onConnect]);

  useEffect(() => {
    if (step === 1 && progress === 2) {
      if (connectionStatus === 'connected') {
        setProgress(3);
        setTimeout(() => {
          setDone(true);
          setTimeout(onComplete, 600);
        }, 400);
      } else if (connectionStatus === 'disconnected' && !connectionError) {
        setConnectionError(true);
      }
    }
  }, [connectionStatus, step, progress, onComplete, connectionError]);

  const handleRetry = () => {
    setConnectionError(false);
    setProgress(1);
    onConnect?.();
  };

  if (step === 0) {
    return (
      <div className="onboarding">
        <div className="onboarding-card">
          <div className="onboarding-logo">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="28" fill="var(--color-primary)" />
              <path d="M20 32c0-6.6 5.4-12 12-12s12 5.4 12 12" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
              <circle cx="32" cy="42" r="4" fill="#fff" />
            </svg>
          </div>

          <h1 className="onboarding-title">Selamat Datang di NARA</h1>
          <p className="onboarding-subtitle">
            AI Assistant lokal untuk Indonesia. Semua data diproses di perangkatmu—tanpa cloud, tanpa kompromi privasi.
          </p>

          <div className="onboarding-features">
            <div className="feature">
              <span className="feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </span>
              <span>Privasi 100% lokal</span>
            </div>
            <div className="feature">
              <span className="feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </span>
              <span>Bahas Indonesia fluent</span>
            </div>
            <div className="feature">
              <span className="feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </span>
              <span>Powered by Ollama</span>
            </div>
          </div>

          <button className="onboarding-btn" onClick={() => setStep(1)}>
            Mulai
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="onboarding">
        <div className="onboarding-card done">
          <div className="done-check">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2>NARA siap digunakan!</h2>
          <p>Terhubung dengan Ollama</p>
        </div>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="onboarding">
        <div className="onboarding-card loading">
          <div className="onboarding-logo small">
            <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="28" fill="var(--color-error)" />
              <path d="M22 22l20 20M42 22L22 42" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>

          <h2 className="loading-title">Gagal terhubung</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
            Pastikan Ollama sedang berjalan. Buka terminal baru dan ketik: <code>ollama serve</code>
          </p>

          <button className="onboarding-btn" onClick={handleRetry}>
            Coba lagi
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding">
      <div className="onboarding-card loading">
        <div className="onboarding-logo small">
          <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="28" fill="var(--color-primary)" />
            <path d="M20 32c0-6.6 5.4-12 12-12s12 5.4 12 12" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
            <circle cx="32" cy="42" r="4" fill="#fff" />
          </svg>
        </div>

        <h2 className="loading-title">Menyiapkan NARA...</h2>

        <div className="setup-steps">
          {SETUP_STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`setup-step ${i < progress ? "done" : ""} ${i === progress ? "active" : ""}`}
            >
              <div className="step-indicator">
                {i < progress ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : i === progress ? (
                  <div className="step-spinner" />
                ) : (
                  <div className="step-dot" />
                )}
              </div>
              <div className="step-content">
                <span className="step-label">{s.label}</span>
                <span className="step-desc">{s.desc}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(progress / SETUP_STEPS.length) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
