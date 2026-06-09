"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, RotateCcw, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useFaceScan } from "@/hooks/useFaceScan";
import type { FaceScanData } from "@/lib/faceScan";
import { cn } from "@/lib/utils";

type AvatarCreatorModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isRtl?: boolean;
  onSaveFaceScan: (scan: FaceScanData) => void;
  onClearCustomGlb?: () => void;
};

export function AvatarCreatorModal({
  open,
  onOpenChange,
  isRtl = false,
  onSaveFaceScan,
  onClearCustomGlb,
}: AvatarCreatorModalProps) {
  const previewRef = useRef<HTMLVideoElement>(null);
  const [done, setDone] = useState(false);

  const scan = useFaceScan({ active: open && !done });

  const t = (en: string, ar: string) => (isRtl ? ar : en);

  useEffect(() => {
    if (!open) {
      setDone(false);
      return;
    }
    onClearCustomGlb?.();
  }, [open, onClearCustomGlb]);

  useEffect(() => {
    const video = scan.videoRef.current;
    const preview = previewRef.current;
    if (!video || !preview || !scan.cameraReady) return;

    preview.srcObject = video.srcObject;
    preview.play().catch(() => undefined);
  }, [scan.cameraReady, scan.videoRef, scan.stepIndex]);

  useEffect(() => {
    if (!open || !scan.isComplete || done || scan.processing) return;

    void scan.finishScan().then((result) => {
      if (result) {
        onSaveFaceScan(result);
        setDone(true);
      }
    });
  }, [
    open,
    scan.isComplete,
    scan.processing,
    scan.finishScan,
    done,
    onSaveFaceScan,
  ]);

  if (!open) return null;

  const progressPercent = Math.round(
    (scan.poseProgress * 0.7 + scan.holdProgress * 0.3) * 100,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              {t("Create your 3D head", "إنشاء رأسك ثلاثي الأبعاد")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                "Builds a real 3D face mesh from your pixels — not a flat sticker.",
                "يبني شبك وجه ثلاثي الأبعاد حقيقي من بكسلاتك — ليس ملصقاً مسطحاً.",
              )}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {!done ? (
          <div className="space-y-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-black">
              <video
                ref={previewRef}
                playsInline
                muted
                className="h-full w-full scale-x-[-1] object-cover"
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                  className={cn(
                    "h-[26rem] w-[20rem] max-h-[92%] max-w-[85%] rounded-[50%] border-2 transition-colors",
                    scan.poseMatched
                      ? "border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.5)]"
                      : scan.faceDetected
                        ? "border-yellow-400"
                        : "border-white/40",
                  )}
                />
              </div>
              <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-4">
                <p className="text-center text-sm font-medium text-white">
                  {scan.currentStep
                    ? t(scan.currentStep.en, scan.currentStep.ar)
                    : t("Processing...", "جاري المعالجة...")}
                </p>
                {scan.currentStep && (
                  <p className="mt-1 text-center text-xs text-white/80">
                    {t(scan.currentStep.hint.en, scan.currentStep.hint.ar)}
                  </p>
                )}
              </div>
              <div className="absolute inset-x-4 bottom-4">
                <div className="mb-2 flex justify-between text-xs text-white/90">
                  <span>{t("Face capture", "التقاط الوجه")}</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-green-400 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {scan.processing && (
              <p className="text-sm text-muted-foreground">
                {t("Building 3D mesh...", "بناء الشبك ثلاثي الأبعاد...")}
              </p>
            )}

            {scan.faceDetected && !scan.poseMatched && !scan.processing && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t("Center your face", "وسّط وجهك")}</span>
                  <span>{Math.round(scan.poseProgress * 100)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${scan.poseProgress * 100}%` }}
                  />
                </div>
              </div>
            )}

            {!scan.faceDetected && scan.cameraReady && (
              <p className="text-sm text-amber-600">
                {t(
                  "Move your face inside the oval guide.",
                  "ضع وجهك داخل الدليل البيضاوي.",
                )}
              </p>
            )}

            {scan.error && (
              <p className="text-sm text-destructive">{scan.error}</p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => scan.manualCapture()}
                disabled={!scan.faceDetected || scan.processing}
              >
                <Camera className="mr-2 h-4 w-4" />
                {t("Capture now", "التقاط الآن")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  scan.reset();
                  setDone(false);
                }}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {t("Restart", "إعادة")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <p className="text-sm font-medium">
              {t("Your 3D head is ready!", "رأسك ثلاثي الأبعاد جاهز!")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t(
                "Background removed. Drag the head to rotate it.",
                "أُزيلت الخلفية. اسحب الرأس لتدويره.",
              )}
            </p>
            <Button type="button" onClick={() => onOpenChange(false)}>
              <Sparkles className="mr-2 h-4 w-4" />
              {t("Use 3D avatar", "استخدام الأفاتار")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
