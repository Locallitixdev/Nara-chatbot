import { OPENCLAW_BASE, getAuthHeaders } from './config';

export async function getOpenClawStatus() {
  try {
    const res = await fetch(`${OPENCLAW_BASE}/api/status`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('OpenClaw status error:', error);
    return { running: false, error: error.message };
  }
}

export async function getModels() {
  try {
    const res = await fetch(`${OPENCLAW_BASE}/api/models`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.models || [];
  } catch (error) {
    console.error('Get models error:', error);
    return [];
  }
}

export async function setModel(modelName) {
  try {
    const res = await fetch(`${OPENCLAW_BASE}/api/models/active`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ model: modelName }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Set model error:', error);
    throw error;
  }
}

export async function chatStream({
  message,
  sessionId = 'main',
  onToken,
  onDone,
  onError,
}) {
  try {
    const response = await fetch(`${OPENCLAW_BASE}/api/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        message,
        sessionId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.trim());

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.content) {
            fullText += json.content;
            onToken?.(json.content);
          }
          if (json.done) {
            onDone?.(fullText);
          }
        } catch {}
      }
    }

    return fullText;
  } catch (error) {
    console.error('Chat error:', error);
    onError?.(error);
    throw error;
  }
}

export async function startAgent() {
  try {
    const res = await fetch(`${OPENCLAW_BASE}/api/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Start agent error:', error);
    throw error;
  }
}

export async function listAutomations() {
  try {
    const res = await fetch(`${OPENCLAW_BASE}/api/automations`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('List automations error:', error);
    return [];
  }
}

export async function toggleAutomation(automationId, enabled) {
  try {
    const res = await fetch(`${OPENCLAW_BASE}/api/automations/${automationId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Toggle automation error:', error);
    throw error;
  }
}

export async function getActivityLogs(limit = 50) {
  try {
    const res = await fetch(`${OPENCLAW_BASE}/api/logs?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Get logs error:', error);
    return [];
  }
}

export async function runTask(task) {
  try {
    const res = await fetch(`${OPENCLAW_BASE}/api/tasks/run`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ task }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Run task error:', error);
    throw error;
  }
}
