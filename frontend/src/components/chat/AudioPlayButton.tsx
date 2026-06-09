"use client";

import { Loader2, Volume2 } from "lucide-react";

import { cn } from "@/lib/utils";

type AudioPlayButtonProps = {
  playing: boolean;
  loading: boolean;
  disabled?: boolean;
  onClick: () => void;
  label?: string;
};

export function AudioPlayButton({
  playing,
  loading,
  disabled = false,
  onClick,
  label = "Listen",
}: AudioPlayButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        "hover:bg-muted disabled:opacity-50",
        playing && "border-primary/30 bg-primary/5 text-primary",
      )}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Volume2 className="h-3.5 w-3.5" />
      )}
      {label}
    </button>
  );
}
