"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Box, Camera, Settings2, Video } from "lucide-react";

import { AvatarCreatorModal } from "@/components/chat/AvatarCreatorModal";
import { Button } from "@/components/ui/button";
import { useAvatarModel } from "@/hooks/useAvatarModel";
import type { AvatarSession } from "@/types/avatar";

const Avatar3DScene = dynamic(
  () =>
    import("@/components/chat/Avatar3DScene").then((m) => m.Avatar3DScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading 3D...
      </div>
    ),
  },
);

type AvatarPanelProps = {
  isEnabled: boolean;
  loading: boolean;
  speaking: boolean;
  supportsStream: boolean;
  session: AvatarSession | null;
  isRtl?: boolean;
};

export function AvatarPanel({
  isEnabled,
  loading,
  speaking,
  supportsStream,
  session,
  isRtl = false,
}: AvatarPanelProps) {
  const [creatorOpen, setCreatorOpen] = useState(false);
  const {
    photoUrl,
    faceScan,
    ready: modelReady,
    saveFaceScan,
    clearCustomGlb,
  } = useAvatarModel();

  const t = (en: string, ar: string) => (isRtl ? ar : en);

  if (loading) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center rounded-2xl border bg-card shadow-sm">
        <span className="text-sm text-muted-foreground">Loading avatar...</span>
      </div>
    );
  }

  if (!isEnabled) {
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl border bg-muted/20 p-6 text-center shadow-sm">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Box className="h-8 w-8" />
        </div>
        <p className="text-sm font-medium">
          {t("Avatar disabled", "الأفاتار غير مفعّل")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("Enable it from the admin settings", "فعّله من لوحة الإدارة")}
        </p>
      </div>
    );
  }

  const showHeyGenStream = supportsStream && session?.stream_url;
  const needsScan = !faceScan;

  return (
    <>
      <div className="relative flex h-full min-h-[360px] flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {t("3D Visual Assistant", "المساعد المرئي 3D")}
              </span>
            </div>
            <button
              type="button"
              aria-label={t("Customize avatar", "تخصيص الأفاتار")}
              title={t("Customize avatar", "تخصيص الأفاتار")}
              onClick={() => setCreatorOpen(true)}
              className="rounded-lg border bg-background p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {showHeyGenStream
              ? `${session?.provider ?? "heygen"} · live stream`
              : faceScan
                ? t("Realistic 3D scan", "مسح 3D واقعي")
                : t("Scan your face with camera", "امسح وجهك بالكاميرا")}
          </p>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-b from-muted/30 to-background">
          {showHeyGenStream ? (
            <iframe
              src={session.stream_url!}
              title="Avatar stream"
              className="h-[360px] w-full border-0 bg-black"
              allow="autoplay; microphone; camera"
            />
          ) : modelReady ? (
            <Avatar3DScene
              speaking={speaking}
              photoUrl={photoUrl}
              faceScan={faceScan}
              className="w-full"
            />
          ) : (
            <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
              Loading...
            </div>
          )}

          {needsScan && !showHeyGenStream && (
            <div className="absolute inset-x-4 bottom-4 rounded-xl border bg-background/95 p-4 text-center shadow-lg backdrop-blur-sm">
              <Camera className="mx-auto mb-2 h-6 w-6 text-primary" />
              <p className="text-sm font-medium">
                {t("Scan your face", "امسح وجهك")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(
                  "Real 3D face mesh from your camera — drag to rotate.",
                  "شبك وجه 3D حقيقي من الكاميرا — اسحب للتدوير.",
                )}
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-3"
                onClick={() => setCreatorOpen(true)}
              >
                <Camera className="mr-2 h-4 w-4" />
                {t("Start face scan", "بدء مسح الوجه")}
              </Button>
            </div>
          )}

          {speaking && !showHeyGenStream && (
            <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow-sm">
              {t("Speaking...", "يتحدث...")}
            </div>
          )}
        </div>
      </div>

      <AvatarCreatorModal
        open={creatorOpen}
        onOpenChange={setCreatorOpen}
        isRtl={isRtl}
        onSaveFaceScan={saveFaceScan}
        onClearCustomGlb={clearCustomGlb}
      />
    </>
  );
}
