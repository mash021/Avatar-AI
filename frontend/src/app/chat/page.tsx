"use client";

import { AvatarPanel } from "@/components/chat/AvatarPanel";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useAvatar } from "@/hooks/useAvatar";
import { useLanguage } from "@/hooks/useLanguage";
import { getSpeakableText } from "@/lib/voice";

export default function ChatPage() {
  const { language } = useLanguage();
  const { playBlob } = useAudioPlayer();

  const avatar = useAvatar({
    language,
    onAudioReady: (blob) => {
      playBlob("avatar-live", blob).catch(() => undefined);
    },
  });

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[minmax(260px,320px)_1fr] lg:items-stretch">
      <AvatarPanel
        isEnabled={avatar.isEnabled}
        loading={avatar.loading}
        speaking={avatar.speaking}
        supportsStream={avatar.supportsStream}
        session={avatar.session}
        isRtl={language === "ar"}
      />
      <ChatWindow
        onAssistantReply={(reply, messageLanguage, autoPlayVoice) => {
          if (avatar.isEnabled) {
            avatar.speak(reply, messageLanguage);
            return;
          }
          if (autoPlayVoice) {
            import("@/lib/voice").then(({ synthesizeSpeech }) =>
              synthesizeSpeech(
                getSpeakableText(reply, messageLanguage),
                messageLanguage as "en" | "ar" | "auto",
              ).then((blob) => playBlob("voice-reply", blob)),
            );
          }
        }}
      />
    </section>
  );
}
