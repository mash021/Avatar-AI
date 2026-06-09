import { Bot, User } from "lucide-react";

import { cn } from "@/lib/utils";

type ChatAvatarProps = {
  role: "user" | "assistant";
  className?: string;
};

export function ChatAvatar({ role, className }: ChatAvatarProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
        isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        className,
      )}
    >
      {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
    </div>
  );
}
