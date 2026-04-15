import { useState, useCallback, useEffect, useRef } from 'react';
import {
  checkOllamaHealth,
  listModels,
  chatOllamaStream,
} from '../services/ollama';
import { DEFAULT_MODEL } from '../services/config';
import { buildRagContext } from '../services/rag';

export function useOpenClaw() {
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [error, setError] = useState(null);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const abortControllerRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  const checkStatus = useCallback(async () => {
    try {
      const status = await checkOllamaHealth();
      if (status.running) {
        setConnectionStatus('connected');
        setError(null);
        return true;
      } else {
        setConnectionStatus('disconnected');
        setError('Ollama not running');
        return false;
      }
    } catch (err) {
      setConnectionStatus('disconnected');
      setError(err.message);
      return false;
    }
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const modelList = await listModels();
      setModels(modelList.map(m => m.name));
      if (modelList.length > 0 && !selectedModel) {
        setSelectedModel(modelList[0].name);
      }
    } catch (err) {
      console.error('Failed to fetch models:', err);
    }
  }, [selectedModel]);

  const connect = useCallback(async () => {
    setConnectionStatus('connecting');
    const isRunning = await checkStatus();
    
    if (isRunning) {
      await fetchModels();
    } else {
      setConnectionStatus('disconnected');
    }
  }, [checkStatus, fetchModels]);

  useEffect(() => {
    connect();

    const pollInterval = setInterval(async () => {
      const status = await checkOllamaHealth();
      if (status.running && connectionStatus !== 'connected') {
        setConnectionStatus('connected');
        await fetchModels();
      } else if (!status.running && connectionStatus === 'connected') {
        setConnectionStatus('disconnected');
      }
    }, 10000);

    return () => {
      clearInterval(pollInterval);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  const handleSelectModel = useCallback((modelName) => {
    setSelectedModel(modelName);
  }, []);

  const sendMessage = useCallback(async (text, activeDocs = []) => {
    if (isStreaming) return;
    
    setIsStreaming(true);
    setStreamingText('');
    setError(null);

    // Create new AbortController for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: text,
    };

    const assistantId = Date.now() + 1;
    const assistantMsg = {
      id: assistantId,
      role: 'assistant',
      content: '',
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);

    const activeDocIds = activeDocs.filter(d => d.active).map(d => d.id);
    const ragContext = await buildRagContext(text, activeDocIds, 3);

    try {
      await chatOllamaStream({
        model: selectedModel,
        messages: [
          ...messages,
          userMsg,
        ].map(m => ({
          role: m.role,
          content: m.content,
        })),
        ragContext,
        signal: controller.signal,
        onToken: (token) => {
          if (controller.signal.aborted) return;
          setStreamingText(prev => prev + token);
          setMessages(prev => prev.map(m =>
            m.id === assistantId
              ? { ...m, content: m.content + token }
              : m
          ));
        },
        onDone: (fullText) => {
          setIsStreaming(false);
          setStreamingText('');
          abortControllerRef.current = null;
          // If aborted, mark the message
          if (fullText === null) {
            setMessages(prev => prev.map(m =>
              m.id === assistantId
                ? { ...m, aborted: true }
                : m
            ));
          }
        },
        onError: (err) => {
          console.error('Chat error:', err);
          setIsStreaming(false);
          setStreamingText('');
          abortControllerRef.current = null;
          setMessages(prev => prev.map(m =>
            m.id === assistantId
              ? { ...m, content: m.content || 'Maaf, terjadi kesalahan koneksi. Pastikan Ollama berjalan.' }
              : m
          ));
          setError(err.message);
        },
      });
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Chat error:', err);
      setIsStreaming(false);
      setStreamingText('');
      abortControllerRef.current = null;
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: 'Maaf, terjadi kesalahan. Coba lagi.' }
          : m
      ));
      setError(err.message);
    }
  }, [isStreaming, selectedModel, messages]);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setStreamingText('');
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const onClearRef = useRef(null);
  const setClearCallback = useCallback((cb) => {
    onClearRef.current = cb;
  }, []);

  const triggerClear = useCallback(() => {
    if (onClearRef.current) {
      onClearRef.current();
    }
  }, []);

  return {
    connectionStatus,
    error,
    models,
    selectedModel,
    selectModel: handleSelectModel,
    messages,
    setMessages,
    isStreaming,
    streamingText,
    sendMessage,
    abort,
    clearMessages,
    setClearCallback,
    triggerClear,
    reconnect: connect,
  };
}
