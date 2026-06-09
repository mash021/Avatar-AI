"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
  }, []);

  const playBlob = useCallback(
    async (id: string, blob: Blob) => {
      stop();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingId(id);

      audio.onended = () => {
        URL.revokeObjectURL(url);
        setPlayingId(null);
        audioRef.current = null;
      };

      try {
        await audio.play();
      } catch {
        URL.revokeObjectURL(url);
        setPlayingId(null);
        audioRef.current = null;
      }
    },
    [stop],
  );

  return { playingId, playBlob, stop };
}
