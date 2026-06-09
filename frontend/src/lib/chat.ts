import type { ChatLanguage, ChatResponse, ChatSessionDetail } from "@/types/chat";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const CHAT_SESSION_KEY = "avatar_chat_session_id";
export const CHAT_LANGUAGE_KEY = "avatar_chat_language";

export function getStoredSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CHAT_SESSION_KEY);
}

export function setStoredSessionId(sessionId: string): void {
  localStorage.setItem(CHAT_SESSION_KEY, sessionId);
}

export function clearStoredSessionId(): void {
  localStorage.removeItem(CHAT_SESSION_KEY);
}

export function getStoredLanguage(): ChatLanguage {
  if (typeof window === "undefined") return "auto";
  const stored = localStorage.getItem(CHAT_LANGUAGE_KEY);
  if (stored === "en" || stored === "ar" || stored === "auto") return stored;
  return "auto";
}

export function setStoredLanguage(language: ChatLanguage): void {
  localStorage.setItem(CHAT_LANGUAGE_KEY, language);
}

export async function sendChatMessage(
  message: string,
  sessionId: string | null,
  language: ChatLanguage,
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      language,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    const detail = error.detail;
    const message = Array.isArray(detail)
      ? detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(", ")
      : typeof detail === "string"
        ? detail
        : "Failed to send message";
    throw new Error(message || "Failed to send message");
  }

  return response.json();
}

export async function fetchChatSession(sessionId: string): Promise<ChatSessionDetail> {
  const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}`);
  if (!response.ok) {
    throw new Error("Failed to load session");
  }
  return response.json();
}

export function isArabicText(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}
