import { useState, useRef, useCallback } from "react";

// Check if running inside Tauri
const isTauri = () => typeof window.__TAURI__ !== "undefined";

// Check if browser supports SpeechRecognition (fallback for dev)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export function useWhisper() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // Web Audio API refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const streamRef = useRef(null);

  // SpeechRecognition ref (browser fallback)
  const recognitionRef = useRef(null);

  // ─── Audio Level Monitor ─────────────────────────────────────
  const startAudioMonitor = useCallback((stream) => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = { analyser, audioCtx };

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(Math.min(avg / 128, 1)); // normalize to 0-1
      animFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const stopAudioMonitor = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (analyserRef.current?.audioCtx) {
      analyserRef.current.audioCtx.close().catch(() => {});
      analyserRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  // ─── Method 1: Web Audio + Tauri Whisper (Production) ────────
  const startRecordingTauri = useCallback(async () => {
    setIsRecording(true);
    setError(null);
    setTranscript("");
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      streamRef.current = stream;
      startAudioMonitor(stream);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start(100);
    } catch (err) {
      setIsRecording(false);
      setError(`Mikrofon tidak tersedia: ${err.message}`);
    }
  }, [startAudioMonitor]);

  const stopRecordingTauri = useCallback(async () => {
    setIsRecording(false);
    setIsTranscribing(true);
    stopAudioMonitor();

    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        setIsTranscribing(false);
        return resolve(null);
      }

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        try {
          const { invoke } = await import("@tauri-apps/api/core");
          const result = await invoke("transcribe_audio_bytes", {
            audioBytes: Array.from(uint8Array),
            language: "id",
          });
          setTranscript(result.text);
          setIsTranscribing(false);
          resolve(result.text);
        } catch (err) {
          setError(`Transkripsi gagal: ${err}`);
          setIsTranscribing(false);
          resolve(null);
        }
      };

      recorder.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    });
  }, [stopAudioMonitor]);

  // ─── Method 2: Browser SpeechRecognition (Dev Fallback) ──────
  const startRecordingBrowser = useCallback(async () => {
    if (!SpeechRecognition) {
      setError("Browser tidak mendukung Speech Recognition. Gunakan Chrome/Edge.");
      return;
    }

    setIsRecording(true);
    setError(null);
    setTranscript("");

    // Also start mic for visual feedback
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      startAudioMonitor(stream);
    } catch {
      // Visual feedback optional, continue without it
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "id-ID";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let final = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(final || interim);
    };

    recognition.onerror = (event) => {
      if (event.error !== 'aborted') {
        setError(`Speech Recognition error: ${event.error}`);
      }
      setIsRecording(false);
      stopAudioMonitor();
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [startAudioMonitor, stopAudioMonitor]);

  const stopRecordingBrowser = useCallback(async () => {
    setIsRecording(false);
    stopAudioMonitor();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // transcript is already set via onresult
    return transcript;
  }, [stopAudioMonitor, transcript]);

  // ─── Public API: auto-select method ──────────────────────────
  const startRecording = useCallback(async () => {
    if (isTauri()) {
      await startRecordingTauri();
    } else {
      await startRecordingBrowser();
    }
  }, [startRecordingTauri, startRecordingBrowser]);

  const stopRecording = useCallback(async () => {
    if (isTauri()) {
      return await stopRecordingTauri();
    } else {
      return await stopRecordingBrowser();
    }
  }, [stopRecordingTauri, stopRecordingBrowser]);

  const cancelRecording = useCallback(() => {
    setIsRecording(false);
    setIsTranscribing(false);
    setTranscript("");
    stopAudioMonitor();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [stopAudioMonitor]);

  return {
    isRecording,
    isTranscribing,
    transcript,
    error,
    audioLevel,
    startRecording,
    stopRecording,
    cancelRecording,
    isSupported: isTauri() || !!SpeechRecognition,
  };
}
