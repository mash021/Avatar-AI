import { AlertCircle } from "lucide-react";

import { AudioPlayButton } from "./AudioPlayButton";
import { ChatAvatar } from "./ChatAvatar";
import { MessageContent } from "./MessageContent";
import { isArabicText } from "@/lib/chat";
import { cn } from "@/lib/utils";
import type { ChatLanguage, ChatMessage } from "@/types/chat";

type MessageBubbleProps = {
  message: ChatMessage;
  chatLanguage?: ChatLanguage;
  onPlayAudio?: (message: ChatMessage) => void;
  playingId?: string | null;
  loadingAudioId?: string | null;
};

export function MessageBubble({
  message,
  chatLanguage = "auto",
  onPlayAudio,
  playingId,
  loadingAudioId,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isRtl =
    chatLanguage === "ar" ||
    message.language === "ar" ||
    isArabicText(message.content);

  const rowReverse = isRtl ? isUser : !isUser;

  return (
    <div
      className={cn(
        "flex items-end gap-2.5",
        rowReverse ? "flex-row-reverse" : "flex-row",
      )}
    >
      <ChatAvatar role={message.role} />

      <div
        className={cn(
          "max-w-[min(80%,34rem)] px-4 py-3 text-sm leading-relaxed shadow-sm",
          isUser
            ? "rounded-2xl rounded-br-md bg-primary text-primary-foreground"
            : "rounded-2xl rounded-bl-md border bg-background text-foreground",
          isRtl && isUser && "rounded-br-2xl rounded-bl-md",
          isRtl && !isUser && "rounded-bl-2xl rounded-br-md",
        )}
      >
        <MessageContent
          content={message.content}
          chatLanguage={chatLanguage}
          messageLanguage={message.language}
        />

        {!isUser && (
          <div
            className={cn(
              "mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-2",
              isRtl && "flex-row-reverse",
            )}
          >
            {onPlayAudio && (
              <AudioPlayButton
                playing={playingId === message.id}
                loading={loadingAudioId === message.id}
                onClick={() => onPlayAudio(message)}
                label={isRtl ? "استماع" : "Listen"}
              />
            )}
            {message.fallback_used && (
              <span
                className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                dir={isRtl ? "rtl" : "ltr"}
              >
                <AlertCircle className="h-3 w-3" />
                {isRtl
                  ? "لم يتم العثور على معلومات مطابقة"
                  : "No matching knowledge found"}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
