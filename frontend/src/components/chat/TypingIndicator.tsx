import { ChatAvatar } from "./ChatAvatar";

type TypingIndicatorProps = {
  label: string;
  alignEnd?: boolean;
};

export function TypingIndicator({ label, alignEnd = false }: TypingIndicatorProps) {
  return (
    <div className={`flex items-end gap-2.5 ${alignEnd ? "flex-row-reverse" : ""}`}>
      <ChatAvatar role="assistant" />
      <div className="rounded-2xl rounded-bl-md border bg-background px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex gap-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
          </span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      </div>
    </div>
  );
}
