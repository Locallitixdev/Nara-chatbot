import { useEffect, useRef, useCallback, useState } from "react";
import MessageBubble from "./MessageBubble";
import InputArea from "./InputArea";
import QuickActions from "./QuickActions";
import "./ChatView.css";

export default function ChatView({
  messages,
  isStreaming,
  onSend,
  onAbort,
  docs,
  connectionStatus,
  lastTask,
  sessions = [],
  activeSessionId = null,
  onSwitchSession,
  onNewSession,
  onDeleteSession,
  onClear,
}) {
  const messagesEndRef = useRef(null);
  const [showSessionMenu, setShowSessionMenu] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleQuickAction = (text) => {
    onSend(text);
  };

  const isConnected = connectionStatus === 'connected';
  const isDisabled = isStreaming || !isConnected;

  const handleSessionChange = useCallback((sessionId) => {
    onSwitchSession(sessionId);
    setShowSessionMenu(false);
  }, [onSwitchSession]);

  const handleDeleteSession = useCallback((e, sessionId) => {
    e.stopPropagation();
    onDeleteSession(sessionId);
    setShowSessionMenu(false);
  }, [onDeleteSession]);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className="chat-view">
      <header className="chat-header">
        <div className="session-selector">
          <button 
            className="session-current"
            onClick={() => setShowSessionMenu(!showSessionMenu)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
            <span>{activeSession?.name || 'Pilih Obrolan'}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {showSessionMenu && (
            <div className="session-dropdown">
              {sessions.map(session => (
                <div
                  key={session.id}
                  className={`session-item ${session.id === activeSessionId ? 'active' : ''}`}
                  onClick={() => handleSessionChange(session.id)}
                >
                  <div className="session-info">
                    <span>{session.name}</span>
                    <span className="session-count">
                      {session.messages?.length || 0} pesan
                    </span>
                  </div>
                  {sessions.length > 1 && (
                    <button
                      className="session-delete"
                      onClick={(e) => handleDeleteSession(e, session.id)}
                      title="Hapus obrolan"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button className="session-item new-session" onClick={() => { onNewSession(); setShowSessionMenu(false); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Obrolan Baru</span>
              </button>
            </div>
          )}
        </div>
        <span className="chat-count">{messages.filter(m => m.role === "user").length} pesan</span>
      </header>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="empty-icon">
              <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="28" fill="var(--color-primary)" opacity="0.1" />
                <path d="M20 32c0-6.6 5.4-12 12-12s12 5.4 12 12" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <circle cx="32" cy="42" r="3" fill="var(--color-primary)" />
              </svg>
            </div>
            <h3>Halo! Saya NARA</h3>
            {lastTask && (
              <p className="last-task-info">
                Terakhir Anda bertanya: <strong>{lastTask.task}</strong>
              </p>
            )}
            {isConnected ? (
              <p>AI Assistant lokal yang siap membantu Anda. Tanyakan apa saja—semua diproses secara offline.</p>
            ) : (
              <p className="connection-warning">
                <span className="warning-icon">!</span>
                OpenClaw belum terhubung. Hubungkan dulu untuk memulai obrolan.
              </p>
            )}
          </div>
        ) : (
          messages.map(m => (
            <MessageBubble
              key={m.id}
              message={m}
              isStreaming={isStreaming && m === messages[messages.length - 1]}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length === 0 && isConnected && (
        <QuickActions onAction={handleQuickAction} />
      )}

      <InputArea
        onSend={onSend}
        disabled={isDisabled}
        docs={docs}
        connectionStatus={connectionStatus}
        isStreaming={isStreaming}
        onAbort={onAbort}
      />
    </div>
  );
}
