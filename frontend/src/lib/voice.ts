import type { ChatLanguage } from "@/types/chat";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export type STTResponse = {
  text: string;
  language: string;
};

export async function transcribeAudio(
  blob: Blob,
  language: ChatLanguage,
  filename = "recording.webm",
): Promise<STTResponse> {
  const formData = new FormData();
  formData.append("file", blob, filename);
  formData.append("language", language);

  const response = await fetch(`${API_BASE_URL}/voice/stt`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Transcription failed" }));
    const detail = error.detail;
    const message =
      typeof detail === "string" ? detail : "Failed to transcribe audio";
    throw new Error(message);
  }

  return response.json();
}

export async function synthesizeSpeech(
  text: string,
  language: ChatLanguage,
): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/voice/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Speech synthesis failed" }));
    const detail = error.detail;
    const message =
      typeof detail === "string" ? detail : "Failed to synthesize speech";
    throw new Error(message);
  }

  return response.blob();
}

export function getSpeakableText(content: string, language: string): string {
  const stripQuotes = (text: string) => text.trim().replace(/^["']|["']$/g, "");

  if (language === "ar") {
    const arMatch = content.match(/AR:\s*([\s\S]+)/i);
    if (arMatch) return stripQuotes(arMatch[1]);
  }

  const enMatch = content.match(/EN:\s*([\s\S]+?)(?=AR:|$)/i);
  if (enMatch) return stripQuotes(enMatch[1]);

  return content;
}
