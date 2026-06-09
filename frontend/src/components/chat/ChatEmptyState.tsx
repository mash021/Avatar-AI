"use client";

import { MessageSquare, Sparkles } from "lucide-react";

type ChatEmptyStateProps = {
  isRtl: boolean;
  onSuggestionClick: (text: string) => void;
};

const SUGGESTIONS_EN = [
  "What are your business hours?",
  "What is Widget Pro price?",
  "When was the company founded?",
];

const SUGGESTIONS_AR = [
  "ما هي ساعات العمل؟",
  "ما هو سعر Widget Pro؟",
  "متى تأسست الشركة؟",
];

export function ChatEmptyState({ isRtl, onSuggestionClick }: ChatEmptyStateProps) {
  const suggestions = isRtl ? SUGGESTIONS_AR : SUGGESTIONS_EN;

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
        <Sparkles className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold">
        {isRtl ? "كيف يمكنني مساعدتك؟" : "How can I help you?"}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {isRtl
          ? "اسأل عن منتجات الشركة أو الخدمات أو ساعات العمل. يمكنك الكتابة أو استخدام الميكروفون."
          : "Ask about company products, services, or business hours. Type or use the microphone."}
      </p>
      <div className="mt-6 flex w-full max-w-lg flex-col gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSuggestionClick(suggestion)}
            className="flex items-center gap-3 rounded-xl border bg-background px-4 py-3 text-start text-sm transition-colors hover:border-primary/30 hover:bg-muted/50"
          >
            <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{suggestion}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
