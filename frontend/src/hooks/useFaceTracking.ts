"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { HeadPose } from "@/lib/avatar3d";

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const NEUTRAL_POSE: HeadPose = { yaw: 0, pitch: 0, roll: 0 };

function matrixToEuler(matrix: number[]): HeadPose {
  const m = matrix;
  const sy = Math.sqrt(m[0] * m[0] + m[1] * m[1]);
  const singular = sy < 1e-6;
  let yaw: number;
  let pitch: number;
  let roll: number;

  if (!singular) {
    yaw = Math.atan2(m[4], m[0]);
    pitch = Math.atan2(-m[8], sy);
    roll = Math.atan2(m[9], m[10]);
  } else {
    yaw = Math.atan2(-m[1], m[5]);
    pitch = Math.atan2(-m[8], sy);
    roll = 0;
  }

  return {
    yaw: yaw * 0.35,
    pitch: pitch * 0.35,
    roll: roll * 0.25,
  };
}

type UseFaceTrackingOptions = {
  enabled: boolean;
};

export function useFaceTracking({ enabled }: UseFaceTrackingOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const landmarkerRef = useRef<{
    detectForVideo: (
      video: HTMLVideoElement,
      timestamp: number,
    ) => {
      facialTransformationMatrixes?: { data: Float32Array }[];
    };
  } | null>(null);

  const [pose, setPose] = useState<HeadPose>(NEUTRAL_POSE);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setActive(false);
    setPose(NEUTRAL_POSE);
  }, []);

  const start = useCallback(async () => {
    if (!enabled) return;
    setError(null);

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
        outputFacialTransformationMatrixes: true,
      });
      landmarkerRef.current = landmarker;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;

      const video = document.createElement("video");
      video.playsInline = true;
      video.muted = true;
      video.srcObject = stream;
      await video.play();
      videoRef.current = video;
      setActive(true);

      let lastVideoTime = -1;
      const tick = () => {
        const lm = landmarkerRef.current;
        const v = videoRef.current;
        if (!lm || !v || v.readyState < 2) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        if (v.currentTime !== lastVideoTime) {
          lastVideoTime = v.currentTime;
          const result = lm.detectForVideo(v, performance.now());
          const matrix = result.facialTransformationMatrixes?.[0]?.data;
          if (matrix) {
            setPose(matrixToEuler(Array.from(matrix)));
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Camera or face tracking failed",
      );
      stop();
    }
  }, [enabled, stop]);

  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }
    return stop;
  }, [enabled, start, stop]);

  return { pose, active, error, videoRef };
}
