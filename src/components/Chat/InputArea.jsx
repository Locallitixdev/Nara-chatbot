import { useState, useRef, useCallback } from "react";
import VoiceButton from "./VoiceButton";
import "./InputArea.css";

export default function InputArea({ onSend, disabled, docs, connectionStatus, isStreaming, onAbort }) {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    textareaRef.current?.focus();
  }, [value, disabled, onSend]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 160) + "px";
    }
  };

  const activeDocs = docs.filter(d => d.active);

  const getPlaceholder = () => {
    if (connectionStatus === 'connecting') return "Menghubungkan ke Ollama...";
    if (connectionStatus === 'disconnected') return "Hubungkan Ollama dulu...";
    return "Tanyakan sesuatu ke NARA...";
  };

  return (
    <form className="input-area" onSubmit={handleSubmit}>
      {activeDocs.length > 0 && (
        <div className="attached-docs">
          <span className="attached-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
            {activeDocs.length} dokumen aktif
          </span>
        </div>
      )}

      <div className="input-wrapper">
        <textarea
          ref={textareaRef}
          className="input-field"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          rows={1}
          disabled={disabled && !isStreaming}
        />

        <div className="input-actions">
          {!isStreaming && (
            <VoiceButton
              onTranscript={(text) => {
                setValue(prev => prev ? `${prev} ${text}` : text);
                textareaRef.current?.focus();
                setTimeout(adjustHeight, 0);
              }}
              disabled={disabled}
            />
          )}

          {isStreaming ? (
            <button
              type="button"
              className="stop-btn"
              onClick={onAbort}
              title="Hentikan respons"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="submit"
              className="send-btn"
              disabled={!value.trim() || disabled}
            >
              {disabled && connectionStatus === 'connecting' ? (
                <div className="send-spinner" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
