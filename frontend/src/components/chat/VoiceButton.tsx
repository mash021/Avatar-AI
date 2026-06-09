"use client";

import { Mic, Square } from "lucide-react";

import { cn } from "@/lib/utils";

type VoiceButtonProps = {
  recording: boolean;
  processing: boolean;
  disabled?: boolean;
  onClick: () => void;
  label?: string;
  recordingLabel?: string;
};

export function VoiceButton({
  recording,
  processing,
  disabled = false,
  onClick,
  label = "Voice",
  recordingLabel = "Stop",
}: VoiceButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || processing}
      aria-label={recording ? recordingLabel : label}
      title={recording ? recordingLabel : label}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full border transition-all",
        recording
          ? "animate-pulse border-destructive/40 bg-destructive/10 text-destructive"
          : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "opacity-50",
      )}
    >
      {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}
