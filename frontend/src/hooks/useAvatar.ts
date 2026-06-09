"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  avatarSpeak,
  closeAvatarSession,
  createAvatarSession,
  fetchAvatarConfig,
  fetchAvatarSpeakAudio,
} from "@/lib/avatar";
import { getSpeakableText } from "@/lib/voice";
import type { AvatarPublicConfig, AvatarSession } from "@/types/avatar";
import type { ChatLanguage } from "@/types/chat";

type UseAvatarOptions = {
  language: ChatLanguage;
  onAudioReady?: (blob: Blob) => void;
};

export function useAvatar({ language, onAudioReady }: UseAvatarOptions) {
  const [config, setConfig] = useState<AvatarPublicConfig | null>(null);
  const [session, setSession] = useState<AvatarSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<string | null>(null);

  useEffect(() => {
    fetchAvatarConfig()
      .then(setConfig)
      .catch(() => setConfig({ is_enabled: false, provider: "none", supports_stream: false }))
      .finally(() => setLoading(false));
  }, []);

  const initSession = useCallback(async () => {
    if (!config?.is_enabled) return null;
    try {
      const created = await createAvatarSession(language);
      setSession(created);
      sessionRef.current = created.session_id;
      return created;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start avatar");
      return null;
    }
  }, [config?.is_enabled, language]);

  useEffect(() => {
    if (!config?.is_enabled) return;
    initSession();
    return () => {
      if (sessionRef.current) {
        closeAvatarSession(sessionRef.current).catch(() => undefined);
        sessionRef.current = null;
      }
    };
  }, [config?.is_enabled, initSession]);

  const speak = useCallback(
    async (text: string, messageLanguage: string) => {
      if (!config?.is_enabled) return;

      let activeSession = session;
      if (!activeSession) {
        activeSession = await initSession();
      }
      if (!activeSession) return;

      setSpeaking(true);
      setError(null);

      try {
        const speakable = getSpeakableText(text, messageLanguage);
        const lang = (messageLanguage === "ar" || messageLanguage === "en"
          ? messageLanguage
          : language) as ChatLanguage;

        await avatarSpeak(activeSession.session_id, speakable, lang);
        const audio = await fetchAvatarSpeakAudio(
          activeSession.session_id,
          speakable,
          lang,
        );
        onAudioReady?.(audio);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Avatar speak failed");
      } finally {
        setSpeaking(false);
      }
    },
    [config?.is_enabled, initSession, language, onAudioReady, session],
  );

  return {
    config,
    session,
    loading,
    speaking,
    error,
    speak,
    isEnabled: Boolean(config?.is_enabled),
    supportsStream: Boolean(config?.supports_stream && session?.stream_url),
  };
}
