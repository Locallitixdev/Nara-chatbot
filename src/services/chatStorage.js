const SESSIONS_KEY = 'nara_chat_sessions';
const ACTIVE_SESSION_KEY = 'nara_active_session';
const LAST_TASK_KEY = 'nara_last_task';

function getSessions() {
  try {
    const data = localStorage.getItem(SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save sessions:', e);
  }
}

export function createSession(name = null) {
  const sessions = getSessions();
  const newSession = {
    id: `session_${Date.now()}`,
    name: name || `Obrolan ${sessions.length + 1}`,
    createdAt: Date.now(),
    messages: [],
  };
  sessions.push(newSession);
  saveSessions(sessions);
  setActiveSession(newSession.id);
  return newSession;
}

export function getActiveSessionId() {
  return localStorage.getItem(ACTIVE_SESSION_KEY);
}

export function setActiveSession(sessionId) {
  localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
}

export function getActiveSession() {
  const sessions = getSessions();
  const activeId = getActiveSessionId();
  return sessions.find(s => s.id === activeId) || sessions[0] || null;
}

export function getAllSessions() {
  return getSessions();
}

export function getSessionMessages(sessionId) {
  const sessions = getSessions();
  const session = sessions.find(s => s.id === sessionId);
  return session?.messages || [];
}

export function saveSessionMessages(sessionId, messages) {
  const sessions = getSessions();
  const sessionIndex = sessions.findIndex(s => s.id === sessionId);
  if (sessionIndex !== -1) {
    sessions[sessionIndex].messages = messages;
    saveSessions(sessions);
  }
}

export function updateSessionName(sessionId, name) {
  const sessions = getSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (session) {
    session.name = name;
    saveSessions(sessions);
  }
}

export function deleteSession(sessionId) {
  const sessions = getSessions();
  if (sessions.length <= 1) {
    return false;
  }
  const filtered = sessions.filter(s => s.id !== sessionId);
  saveSessions(filtered);
  
  if (getActiveSessionId() === sessionId) {
    if (filtered.length > 0) {
      setActiveSession(filtered[0].id);
    }
  }
  return true;
}

export function saveLastTask(task) {
  try {
    localStorage.setItem(LAST_TASK_KEY, JSON.stringify({
      task: task,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.error('Failed to save last task:', e);
  }
}

export function loadLastTask() {
  try {
    const data = localStorage.getItem(LAST_TASK_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function clearHistory() {
  localStorage.removeItem(SESSIONS_KEY);
  localStorage.removeItem(ACTIVE_SESSION_KEY);
  localStorage.removeItem(LAST_TASK_KEY);
  createSession();
}
