"use client";

import { ArrowUp, Loader2 } from "lucide-react";
import { useState } from "react";

import { VoiceButton } from "./VoiceButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatLanguage } from "@/types/chat";

type ChatInputProps = {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  sendLabel?: string;
  language?: ChatLanguage;
  voiceRecording?: boolean;
  voiceProcessing?: boolean;
  onVoiceToggle?: () => void;
  voiceLabel?: string;
  voiceRecordingLabel?: string;
};

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Type your message...",
  sendLabel = "Send",
  language = "auto",
  voiceRecording = false,
  voiceProcessing = false,
  onVoiceToggle,
  voiceLabel = "Voice",
  voiceRecordingLabel = "Stop",
}: ChatInputProps) {
  const isRtl = language === "ar";
  const [value, setValue] = useState("");
  const canSend = value.trim().length > 0 && !disabled;

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="border-t bg-card/80 p-4 backdrop-blur-sm">
      <div className="flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/20">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          dir={isRtl ? "rtl" : "ltr"}
          lang={isRtl ? "ar" : undefined}
          className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-start leading-relaxed outline-none placeholder:text-muted-foreground"
        />

        <div className="flex shrink-0 items-center gap-1.5 pb-1 pe-1">
          {onVoiceToggle && (
            <VoiceButton
              recording={voiceRecording}
              processing={voiceProcessing}
              disabled={disabled}
              onClick={onVoiceToggle}
              label={voiceLabel}
              recordingLabel={voiceRecordingLabel}
            />
          )}

          <Button
            type="button"
            size="icon"
            onClick={handleSubmit}
            disabled={!canSend}
            aria-label={sendLabel}
            className={cn(
              "h-9 w-9 rounded-full transition-all",
              canSend ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {voiceProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        {isRtl ? "Enter للإرسال · Shift+Enter سطر جديد" : "Enter to send · Shift+Enter for new line"}
      </p>
    </div>
  );
}
