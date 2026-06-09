"use client";

import { useCallback, useRef, useState } from "react";

type UseVoiceRecorderOptions = {
  onRecorded: (blob: Blob) => Promise<void>;
};

export function useVoiceRecorder({ onRecorded }: UseVoiceRecorderOptions) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    mediaRecorderRef.current = null;
    setRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Microphone is not supported in this browser");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });

        if (blob.size === 0) {
          setError("No audio captured");
          return;
        }

        setProcessing(true);
        try {
          await onRecorded(blob);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Voice processing failed");
        } finally {
          setProcessing(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError("Microphone permission denied");
    }
  }, [onRecorded]);

  const toggleRecording = useCallback(async () => {
    if (processing) return;
    if (recording) {
      stopRecording();
      return;
    }
    await startRecording();
  }, [processing, recording, startRecording, stopRecording]);

  return {
    recording,
    processing,
    error,
    toggleRecording,
    clearError: () => setError(null),
  };
}
