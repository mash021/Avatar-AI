"use client";

import { cn } from "@/lib/utils";
import type { ChatLanguage } from "@/types/chat";

type LanguageToggleProps = {
  value: ChatLanguage;
  onChange: (language: ChatLanguage) => void;
};

const options: { value: ChatLanguage; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "en", label: "EN" },
  { value: "ar", label: "AR" },
];

export function LanguageToggle({ value, onChange }: LanguageToggleProps) {
  return (
    <div className="inline-flex items-center rounded-full border bg-background p-1 shadow-sm">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
            value === option.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
