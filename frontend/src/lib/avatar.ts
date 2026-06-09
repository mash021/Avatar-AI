import type {
  AvatarPublicConfig,
  AvatarSession,
  AvatarSpeakResponse,
} from "@/types/avatar";
import type { ChatLanguage } from "@/types/chat";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export async function fetchAvatarConfig(): Promise<AvatarPublicConfig> {
  const response = await fetch(`${API_BASE_URL}/avatar/config`);
  if (!response.ok) throw new Error("Failed to load avatar config");
  return response.json();
}

export async function createAvatarSession(
  language: ChatLanguage = "auto",
): Promise<AvatarSession> {
  const response = await fetch(`${API_BASE_URL}/avatar/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to create session" }));
    throw new Error(error.detail ?? "Failed to create avatar session");
  }
  return response.json();
}

export async function avatarSpeak(
  sessionId: string,
  text: string,
  language: ChatLanguage,
): Promise<AvatarSpeakResponse> {
  const response = await fetch(`${API_BASE_URL}/avatar/speak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, text, language }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Avatar speak failed" }));
    throw new Error(error.detail ?? "Avatar speak failed");
  }
  return response.json();
}

export async function fetchAvatarSpeakAudio(
  sessionId: string,
  text: string,
  language: ChatLanguage,
): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/avatar/speak/audio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, text, language }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Avatar audio failed" }));
    throw new Error(error.detail ?? "Avatar audio failed");
  }
  return response.blob();
}

export async function closeAvatarSession(sessionId: string): Promise<void> {
  await fetch(`${API_BASE_URL}/avatar/session/${sessionId}`, { method: "DELETE" });
}

export {
  fetchAdminAvatarConfig,
  updateAdminAvatarConfig,
} from "./api";

export async function testAdminAvatar(payload: {
  text: string;
  language: string;
}): Promise<Blob> {
  const { getAccessToken } = await import("./auth");
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/admin/avatar/test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Avatar test failed" }));
    throw new Error(error.detail ?? "Avatar test failed");
  }
  return response.blob();
}
