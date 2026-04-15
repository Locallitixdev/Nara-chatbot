import { useCallback } from "react";
import { useWhisper } from "../../hooks/useWhisper";
import "./VoiceButton.css";

export default function VoiceButton({ onTranscript, disabled = false }) {
  const {
    isRecording,
    isTranscribing,
    transcript,
    error,
    audioLevel,
    startRecording,
    stopRecording,
    cancelRecording,
    isSupported,
  } = useWhisper();

  const handleClick = useCallback(async () => {
    if (isTranscribing) return;

    if (isRecording) {
      const text = await stopRecording();
      if (text && text.trim()) {
        onTranscript(text.trim());
      }
    } else {
      await startRecording();
    }
  }, [isRecording, isTranscribing, startRecording, stopRecording, onTranscript]);

  const handleCancel = useCallback((e) => {
    e.stopPropagation();
    cancelRecording();
  }, [cancelRecording]);

  // Auto-send transcript when it changes (for browser SpeechRecognition)
  // This is handled by the parent via onTranscript in handleClick

  if (!isSupported) return null;

  // Dynamic ring scale based on audio level
  const ringScale = isRecording ? 1 + audioLevel * 0.4 : 1;
  const ringOpacity = isRecording ? 0.3 + audioLevel * 0.5 : 0;

  return (
    <div className="voice-button-container">
      {isRecording && (
        <div className="voice-status">
          <div className="voice-status-dot" />
          <span className="voice-status-text">
            {transcript ? transcript : "Mendengarkan..."}
          </span>
          <button className="voice-cancel" onClick={handleCancel} title="Batalkan">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      <button
        className={`voice-btn ${isRecording ? "recording" : ""} ${isTranscribing ? "transcribing" : ""}`}
        onClick={handleClick}
        disabled={disabled || isTranscribing}
        title={
          isTranscribing
            ? "Memproses transkripsi..."
            : isRecording
            ? "Klik untuk stop & kirim"
            : "Klik untuk bicara"
        }
      >
        {/* Animated ring */}
        <div
          className="voice-ring"
          style={{
            transform: `scale(${ringScale})`,
            opacity: ringOpacity,
          }}
        />

        {/* Icon */}
        <div className="voice-icon">
          {isTranscribing ? (
            <div className="voice-spinner" />
          ) : isRecording ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </div>
      </button>

      {error && (
        <div className="voice-error">
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
