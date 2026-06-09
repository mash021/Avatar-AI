"use client";

import { useCallback, useEffect, useState } from "react";

import {
  fetchChatSession,
  getStoredSessionId,
  sendChatMessage,
  setStoredSessionId,
} from "@/lib/chat";
import type { ChatLanguage, ChatMessage, ChatResponse } from "@/types/chat";

export function useChat(language: ChatLanguage) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const stored = getStoredSessionId();
    if (!stored) {
      setInitializing(false);
      return;
    }

    setSessionId(stored);
    fetchChatSession(stored)
      .then((session) => {
        setMessages(
          session.messages
            .filter((msg) => msg.role === "user" || msg.role === "assistant")
            .map((msg) => ({
              id: msg.id,
              role: msg.role as "user" | "assistant",
              content: msg.content,
              language: msg.language,
              had_context: msg.had_context,
              fallback_used: msg.fallback_used,
              created_at: msg.created_at,
            })),
        );
      })
      .catch(() => {
        setSessionId(null);
      })
      .finally(() => setInitializing(false));
  }, []);

  const sendMessage = useCallback(
    async (text: string): Promise<ChatResponse | null> => {
      const trimmed = text.trim();
      if (!trimmed || loading) return null;

      const userMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: trimmed,
        language: language === "auto" ? "en" : language,
      };

      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setError(null);

      try {
        const response = await sendChatMessage(trimmed, sessionId, language);
        setSessionId(response.session_id);
        setStoredSessionId(response.session_id);

        const assistantMsg: ChatMessage = {
          id: response.message_id,
          role: "assistant",
          content: response.reply,
          language: response.language,
          had_context: response.had_context,
          fallback_used: response.fallback_used,
        };

        setMessages((prev) => [...prev, assistantMsg]);
        return response;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [language, loading, sessionId],
  );

  return { messages, loading, error, sendMessage, initializing };
}
