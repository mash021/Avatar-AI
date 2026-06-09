"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  buildHeadAvatarFromCaptures,
  getHeadPoseFromLandmarks,
  getPoseProgress,
  isPoseMatched,
  SCAN_STEPS,
  type FaceCapture,
  type FaceLandmark,
  type HeadPoseMetrics,
} from "@/lib/faceScan";

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const HOLD_MS = 500;

type UseFaceScanOptions = {
  active: boolean;
};

export function useFaceScan({ active }: UseFaceScanOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const stepIndexRef = useRef(0);
  const capturesRef = useRef<FaceCapture[]>([]);
  const latestLandmarksRef = useRef<FaceLandmark[] | null>(null);
  const landmarkerRef = useRef<{
    detectForVideo: (
      video: HTMLVideoElement,
      timestamp: number,
    ) => {
      faceLandmarks?: FaceLandmark[][];
    };
  } | null>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [captures, setCaptures] = useState<FaceCapture[]>([]);
  const [cameraReady, setCameraReady] = useState(false);
  const [poseMatched, setPoseMatched] = useState(false);
  const [poseProgress, setPoseProgress] = useState(0);
  const [poseMetrics, setPoseMetrics] = useState<HeadPoseMetrics>({
    yaw: 0,
    pitch: 0,
  });
  const [faceDetected, setFaceDetected] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);

  const currentStep = SCAN_STEPS[stepIndex];
  const isComplete = stepIndex >= SCAN_STEPS.length;

  const captureCurrentStep = useCallback(() => {
    const v = videoRef.current;
    const step = SCAN_STEPS[stepIndexRef.current];
    const landmarks = latestLandmarksRef.current;
    if (!v || !step || !landmarks) return false;

    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    // Keep pixels aligned with MediaPipe landmarks (preview is mirrored via CSS only).
    ctx.drawImage(v, 0, 0);

    const capture: FaceCapture = {
      pose: step.id,
      photo: canvas.toDataURL("image/jpeg", 0.97),
      landmarks: landmarks.map((point) => ({
        x: point.x,
        y: point.y,
        z: point.z,
      })),
      videoWidth: v.videoWidth,
      videoHeight: v.videoHeight,
    };

    capturesRef.current = [...capturesRef.current, capture];
    setCaptures(capturesRef.current);
    stepIndexRef.current += 1;
    setStepIndex(stepIndexRef.current);
    setHoldProgress(0);
    setPoseMatched(false);
    return true;
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    landmarkerRef.current = null;
    latestLandmarksRef.current = null;
    setCameraReady(false);
    setPoseMatched(false);
    setFaceDetected(false);
    setHoldProgress(0);
    setPoseProgress(0);
  }, []);

  const reset = useCallback(() => {
    stepIndexRef.current = 0;
    capturesRef.current = [];
    latestLandmarksRef.current = null;
    setStepIndex(0);
    setCaptures([]);
    setProcessing(false);
    setError(null);
    setHoldProgress(0);
    setPoseProgress(0);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    reset();

    try {
      const { FaceLandmarker, FilesetResolver } = await import(
        "@mediapipe/tasks-vision"
      );
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
      const landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numFaces: 1,
      });
      landmarkerRef.current = landmarker;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
        audio: false,
      });
      streamRef.current = stream;

      const video = document.createElement("video");
      video.playsInline = true;
      video.muted = true;
      video.srcObject = stream;
      await video.play();
      videoRef.current = video;
      setCameraReady(true);

      let lastVideoTime = -1;
      let holdStart: number | null = null;

      const tick = (now: number) => {
        const lm = landmarkerRef.current;
        const v = videoRef.current;
        const step = SCAN_STEPS[stepIndexRef.current];

        if (!lm || !v || v.readyState < 2) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        if (!step) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        if (v.currentTime !== lastVideoTime) {
          lastVideoTime = v.currentTime;
          const result = lm.detectForVideo(v, performance.now());
          const landmarks = result.faceLandmarks?.[0];

          if (landmarks) {
            const normalized = landmarks.map((point) => ({
              x: point.x,
              y: point.y,
              z: point.z,
            }));
            latestLandmarksRef.current = normalized;
            setFaceDetected(true);

            const metrics = getHeadPoseFromLandmarks(normalized);
            setPoseMetrics(metrics);
            const progress = getPoseProgress(step.id, metrics);
            setPoseProgress(progress);
            const matched = isPoseMatched(step.id, metrics);
            setPoseMatched(matched);

            if (matched) {
              if (holdStart === null) holdStart = now;
              const elapsed = now - holdStart;
              const hold = Math.min(elapsed / HOLD_MS, 1);
              setHoldProgress(hold);
              if (hold >= 1) {
                captureCurrentStep();
                holdStart = null;
              }
            } else {
              holdStart = null;
              setHoldProgress(0);
            }
          } else {
            latestLandmarksRef.current = null;
            setFaceDetected(false);
            setPoseMatched(false);
            setPoseProgress(0);
            holdStart = null;
            setHoldProgress(0);
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Camera scan failed to start",
      );
      stop();
    }
  }, [captureCurrentStep, reset, stop]);

  useEffect(() => {
    if (active) {
      start();
    } else {
      stop();
    }
    return stop;
  }, [active, start, stop]);

  const finishScan = useCallback(async () => {
    if (!capturesRef.current.length) {
      setError("No capture found. Please rescan.");
      return null;
    }
    setProcessing(true);
    setError(null);
    try {
      return await buildHeadAvatarFromCaptures(capturesRef.current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to build 3D face");
      return null;
    } finally {
      setProcessing(false);
    }
  }, []);

  const manualCapture = useCallback(() => {
    if (!faceDetected) {
      setError("No face detected. Move into the oval guide.");
      return false;
    }
    setError(null);
    return captureCurrentStep();
  }, [captureCurrentStep, faceDetected]);

  return {
    videoRef,
    currentStep,
    stepIndex,
    totalSteps: SCAN_STEPS.length,
    captures,
    cameraReady,
    poseMatched,
    poseProgress,
    poseMetrics,
    faceDetected,
    holdProgress,
    processing,
    error,
    isComplete,
    finishScan,
    manualCapture,
    reset,
  };
}
