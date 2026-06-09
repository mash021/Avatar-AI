"use client";

import { Bot, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { getSpeakableText, synthesizeSpeech, transcribeAudio } from "@/lib/voice";

import { ChatEmptyState } from "./ChatEmptyState";
import { ChatInput } from "./ChatInput";
import { LanguageToggle } from "./LanguageToggle";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useChat } from "@/hooks/useChat";
import { useLanguage } from "@/hooks/useLanguage";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import type { ChatMessage } from "@/types/chat";

type ChatWindowProps = {
  onAssistantReply?: (
    reply: string,
    messageLanguage: string,
    autoPlayVoice: boolean,
  ) => void;
};

export function ChatWindow({ onAssistantReply }: ChatWindowProps = {}) {
  const { language, setLanguage } = useLanguage();
  const { messages, loading, error, sendMessage, initializing } = useChat(language);
  const { playingId, playBlob } = useAudioPlayer();
  const [ttsLoadingId, setTtsLoadingId] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const playMessageAudio = useCallback(
    async (message: ChatMessage) => {
      setVoiceError(null);
      setTtsLoadingId(message.id);
      try {
        const text = getSpeakableText(message.content, message.language);
        const audio = await synthesizeSpeech(text, message.language as "en" | "ar" | "auto");
        await playBlob(message.id, audio);
      } catch (err) {
        setVoiceError(err instanceof Error ? err.message : "Audio playback failed");
      } finally {
        setTtsLoadingId(null);
      }
    },
    [playBlob],
  );

  const handleSend = useCallback(
    async (text: string, autoPlay = false) => {
      const response = await sendMessage(text);
      if (response) {
        if (onAssistantReply) {
          onAssistantReply(response.reply, response.language, autoPlay);
        } else if (autoPlay) {
          await playMessageAudio({
            id: response.message_id,
            role: "assistant",
            content: response.reply,
            language: response.language,
          });
        }
      }
    },
    [onAssistantReply, playMessageAudio, sendMessage],
  );

  const handleVoiceRecorded = useCallback(
    async (blob: Blob) => {
      setVoiceError(null);
      const stt = await transcribeAudio(blob, language);
      await handleSend(stt.text, true);
    },
    [handleSend, language],
  );

  const {
    recording,
    processing,
    error: recorderError,
    toggleRecording,
    clearError,
  } = useVoiceRecorder({ onRecorded: handleVoiceRecorded });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  if (initializing) {
    return (
      <div className="flex h-[min(720px,80vh)] items-center justify-center rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          Loading conversation...
        </div>
      </div>
    );
  }

  const isRtl = language === "ar";
  const combinedError = error || voiceError || recorderError;

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      lang={isRtl ? "ar" : "en"}
      className="flex h-[min(720px,80vh)] flex-col overflow-hidden rounded-2xl border bg-card shadow-md"
    >
      <header className="flex items-center justify-between gap-4 border-b bg-card px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0 text-start">
            <h2 className="truncate text-base font-semibold">
              {isRtl ? "مساعد الشركة" : "Company Assistant"}
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              {isRtl
                ? "مدعوم بقاعدة معرفة الشركة"
                : "Powered by company knowledge base"}
            </p>
          </div>
        </div>
        <LanguageToggle value={language} onChange={setLanguage} />
      </header>

      <div
        ref={scrollRef}
        className="chat-scroll flex-1 space-y-5 overflow-y-auto bg-muted/30 px-4 py-5 sm:px-6"
      >
        {messages.length === 0 && !loading ? (
          <ChatEmptyState isRtl={isRtl} onSuggestionClick={(text) => handleSend(text, false)} />
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                chatLanguage={language}
                onPlayAudio={message.role === "assistant" ? playMessageAudio : undefined}
                playingId={playingId}
                loadingAudioId={ttsLoadingId}
              />
            ))}
            {loading && (
              <TypingIndicator
                label={isRtl ? "جاري التفكير..." : "Thinking..."}
                alignEnd={isRtl}
              />
            )}
          </>
        )}
      </div>

      {combinedError && (
        <div className="flex items-center justify-between gap-3 border-t bg-destructive/5 px-5 py-3 text-sm text-destructive">
          <span>{combinedError}</span>
          {recorderError && (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-destructive/20 px-2 py-1 text-xs hover:bg-destructive/10"
              onClick={clearError}
            >
              <X className="h-3 w-3" />
              {isRtl ? "إغلاق" : "Dismiss"}
            </button>
          )}
        </div>
      )}

      <ChatInput
        onSend={(text) => handleSend(text, false)}
        disabled={loading || processing}
        language={language}
        placeholder={isRtl ? "اكتب رسالتك..." : "Type your message..."}
        sendLabel={isRtl ? "إرسال" : "Send"}
        voiceRecording={recording}
        voiceProcessing={processing}
        onVoiceToggle={toggleRecording}
        voiceLabel={isRtl ? "صوت" : "Voice"}
        voiceRecordingLabel={isRtl ? "إيقاف" : "Stop"}
      />
    </div>
  );
}
