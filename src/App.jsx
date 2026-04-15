import { useState, useCallback, useEffect } from "react";
import OnboardingOverlay from "./components/Onboarding/OnboardingOverlay";
import Sidebar from "./components/Panels/Sidebar";
import RightPanel from "./components/Panels/RightPanel";
import ChatView from "./components/Chat/ChatView";
import DocumentsView from "./components/Views/DocumentsView";
import AutomationsView from "./components/Views/AutomationsView";
import SettingsView from "./components/Views/SettingsView";
import { useOpenClaw } from "./hooks/useOpenClaw";
import { useTheme } from "./hooks/useTheme";
import { vectorStore } from "./services/rag";
import { knowledgeSyncManager } from "./services/knowledgeSync";
import {
  getAllSessions,
  getActiveSession,
  getActiveSessionId,
  setActiveSession,
  createSession,
  getSessionMessages,
  saveSessionMessages,
  deleteSession,
  saveLastTask,
  loadLastTask,
} from "./services/chatStorage";
import "./styles/globals.css";

const ONBOARDING_DONE_KEY = 'nara_onboarding_done';

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem(ONBOARDING_DONE_KEY);
  });
  const [activeView, setActiveView] = useState("chat");
  const [lastTask, setLastTask] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [docs, setDocs] = useState([]);
  const { theme, toggleTheme } = useTheme();

  const {
    connectionStatus,
    error,
    models,
    selectedModel,
    selectModel,
    messages,
    setMessages,
    isStreaming,
    streamingText,
    sendMessage,
    abort,
    clearMessages,
    reconnect,
  } = useOpenClaw();

  useEffect(() => {
    let allSessions = getAllSessions();
    if (allSessions.length === 0) {
      createSession();
      allSessions = getAllSessions();
    }
    setSessions(allSessions);

    const activeId = getActiveSessionId();
    if (activeId) {
      setActiveSessionId(activeId);
      const active = getActiveSession();
      if (active?.messages?.length > 0) {
        setMessages(active.messages);
      }
    } else if (allSessions.length > 0) {
      setActiveSessionId(allSessions[0].id);
      if (allSessions[0].messages?.length > 0) {
        setMessages(allSessions[0].messages);
      }
    }

    const task = loadLastTask();
    if (task) {
      setLastTask(task);
    }

    // Start background knowledge sync (self-learning)
    knowledgeSyncManager.start();
    return () => knowledgeSyncManager.stop();
  }, [setMessages]);

  useEffect(() => {
    if (activeSessionId && messages.length > 0) {
      saveSessionMessages(activeSessionId, messages);
    }
  }, [messages, activeSessionId]);

  const handleClear = useCallback(() => {
    if (activeSessionId && messages.length > 0) {
      saveSessionMessages(activeSessionId, messages);
    }
    const newSession = createSession();
    setSessions(getAllSessions());
    setActiveSessionId(newSession.id);
    clearMessages();
    setLastTask(null);
  }, [activeSessionId, messages, clearMessages]);

  const handleSwitchSession = useCallback((sessionId) => {
    if (activeSessionId && messages.length > 0) {
      saveSessionMessages(activeSessionId, messages);
    }
    setActiveSession(sessionId);
    setActiveSessionId(sessionId);
    const sessionMsgs = getSessionMessages(sessionId);
    setMessages(sessionMsgs);
  }, [activeSessionId, messages, setMessages]);

  const handleNewSession = useCallback(() => {
    if (activeSessionId && messages.length > 0) {
      saveSessionMessages(activeSessionId, messages);
    }
    const newSession = createSession();
    setSessions(getAllSessions());
    setActiveSessionId(newSession.id);
    clearMessages();
  }, [activeSessionId, messages, clearMessages]);

  const handleDeleteSession = useCallback((sessionId) => {
    if (messages.length > 0 && sessionId === activeSessionId) {
      saveSessionMessages(activeSessionId, messages);
    }
    const deleted = deleteSession(sessionId);
    if (deleted) {
      const updatedSessions = getAllSessions();
      setSessions(updatedSessions);
      const newActiveId = getActiveSessionId();
      setActiveSessionId(newActiveId);
      const sessionMsgs = getSessionMessages(newActiveId);
      setMessages(sessionMsgs);
    }
  }, [activeSessionId, messages]);

  const handleSendMessage = useCallback((text) => {
    saveLastTask(text);
    setLastTask({ task: text, timestamp: Date.now() });
    
    const activeDocs = docs
      .filter(d => d.indexed && d.active)
      .map(d => ({ id: d.id || d.path, name: d.name, active: true }));
    sendMessage(text, activeDocs);
  }, [sendMessage, docs]);

  const renderView = () => {
    switch (activeView) {
      case "chat":
        return (
          <ChatView
            messages={messages}
            isStreaming={isStreaming}
            onSend={handleSendMessage}
            onAbort={abort}
            docs={docs}
            connectionStatus={connectionStatus}
            lastTask={lastTask}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSwitchSession={handleSwitchSession}
            onNewSession={handleNewSession}
            onDeleteSession={handleDeleteSession}
            onClear={handleClear}
          />
        );
      case "documents":
        return <DocumentsView docs={docs} setDocs={setDocs} />;
      case "automations":
        return <AutomationsView />;
      case "settings":
        return (
          <SettingsView
            selectedModel={selectedModel}
            availableModels={models}
            onModelChange={selectModel}
            connectionStatus={connectionStatus}
            onReconnect={reconnect}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {showOnboarding && (
        <OnboardingOverlay
          onComplete={() => {
            localStorage.setItem(ONBOARDING_DONE_KEY, 'true');
            setShowOnboarding(false);
          }}
          onConnect={reconnect}
          connectionStatus={connectionStatus}
        />
      )}

      <div className="app-layout">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />

        <main className="main-content">
          {renderView()}
        </main>

        <RightPanel
          selectedModel={selectedModel}
          availableModels={models}
          onModelChange={selectModel}
          connectionStatus={connectionStatus}
          onReconnect={reconnect}
          error={error}
        />
      </div>
    </>
  );
}
