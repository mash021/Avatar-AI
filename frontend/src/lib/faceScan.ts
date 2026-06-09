import { cropFaceForMesh } from "@/lib/faceCrop";
import { FACE_MESH_TRIANGLES } from "@/lib/faceMeshTriangulation";

export type ScanPoseId = "front" | "left" | "right";

export type FaceLandmark = { x: number; y: number; z: number };

export type HeadPoseMetrics = {
  yaw: number;
  pitch: number;
};

export type FaceCapture = {
  pose: ScanPoseId;
  photo: string;
  landmarks: FaceLandmark[];
  videoWidth: number;
  videoHeight: number;
};

/** Real 3D face mesh built from MediaPipe landmarks + per-vertex skin colors. */
export type FaceScanData = {
  version: 2;
  vertices: number[];
  uvs: number[];
  colors: number[];
  indices: number[];
  photoUrl: string;
};

export const SCAN_STEPS: Array<{
  id: ScanPoseId;
  en: string;
  ar: string;
  hint: { en: string; ar: string };
}> = [
  {
    id: "front",
    en: "Look straight at the camera",
    ar: "انظر مباشرة إلى الكاميرا",
    hint: {
      en: "Hold still — we sample your real skin pixels",
      ar: "ابق ثابتاً — نأخذ عينات من بكسلات بشرتك الحقيقية",
    },
  },
  {
    id: "left",
    en: "Turn your head slightly left",
    ar: "أدر رأسك قليلاً إلى اليسار",
    hint: {
      en: "Improves 3D depth on the sides",
      ar: "يحسّن العمق ثلاثي الأبعاد على الجوانب",
    },
  },
  {
    id: "right",
    en: "Turn your head slightly right",
    ar: "أدر رأسك قليلاً إلى اليمين",
    hint: {
      en: "Last step — almost done",
      ar: "الخطوة الأخيرة — أوشكت على الانتهاء",
    },
  },
];

const FACE_LANDMARK_COUNT = 468;
const DEPTH_SCALE = 2.8;
const COLOR_SAMPLE_RADIUS = 2;

function eyeDistance(landmarks: FaceLandmark[]): number {
  const left = landmarks[33];
  const right = landmarks[263];
  if (!left || !right) return 1;
  return Math.hypot(right.x - left.x, right.y - left.y) || 1;
}

export function getHeadPoseFromLandmarks(
  landmarks: FaceLandmark[],
): HeadPoseMetrics {
  const nose = landmarks[1];
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];

  if (!nose || !leftEye || !rightEye) {
    return { yaw: 0, pitch: 0 };
  }

  const eyeMidX = (leftEye.x + rightEye.x) / 2;
  const eyeMidY = (leftEye.y + rightEye.y) / 2;
  const eyeDist = eyeDistance(landmarks);

  const noseOffsetX = (nose.x - eyeMidX) / eyeDist;
  const cheekDepth =
    leftCheek && rightCheek ? (leftCheek.z - rightCheek.z) * 5 : 0;
  const yaw = noseOffsetX * 1.4 + cheekDepth * 0.8;
  const pitch = (nose.y - eyeMidY) / eyeDist - 0.35;

  return { yaw, pitch };
}

export function getPoseProgress(
  pose: ScanPoseId,
  metrics: HeadPoseMetrics,
): number {
  switch (pose) {
    case "front":
      return clamp01(
        1 - Math.abs(metrics.yaw) / 0.1 - Math.abs(metrics.pitch) / 0.1,
      );
    case "left":
      return clamp01(1 - Math.abs(metrics.yaw + 0.32) / 0.14);
    case "right":
      return clamp01(1 - Math.abs(metrics.yaw - 0.32) / 0.14);
    default:
      return 0;
  }
}

export function isPoseMatched(
  pose: ScanPoseId,
  metrics: HeadPoseMetrics,
): boolean {
  switch (pose) {
    case "front":
      return Math.abs(metrics.yaw) < 0.1 && Math.abs(metrics.pitch) < 0.12;
    case "left":
      return metrics.yaw < -0.22 && metrics.yaw > -0.42;
    case "right":
      return metrics.yaw > 0.22 && metrics.yaw < 0.42;
    default:
      return false;
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function refineDepthFromSideCaptures(
  front: FaceLandmark[],
  left?: FaceLandmark[],
  right?: FaceLandmark[],
): FaceLandmark[] {
  if (!left && !right) return front;

  const nose = front[1] ?? front[0];
  const midX = nose.x;

  return front.map((point, index) => {
    let z = point.z;

    if (left && point.x < midX - 0.02) {
      const sideZ = left[index]?.z ?? point.z;
      z = point.z * 0.35 + sideZ * 0.65;
    } else if (right && point.x > midX + 0.02) {
      const sideZ = right[index]?.z ?? point.z;
      z = point.z * 0.35 + sideZ * 0.65;
    }

    return { ...point, z };
  });
}

function sampleVertexColors(
  pixels: Uint8ClampedArray,
  sourceW: number,
  sourceH: number,
  landmarks: FaceLandmark[],
): number[] {
  const colors: number[] = [];

  for (let i = 0; i < FACE_LANDMARK_COUNT; i += 1) {
    const point = landmarks[i];
    const cx = Math.floor(point.x * sourceW);
    const cy = Math.floor(point.y * sourceH);
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;

    for (let dy = -COLOR_SAMPLE_RADIUS; dy <= COLOR_SAMPLE_RADIUS; dy += 1) {
      for (let dx = -COLOR_SAMPLE_RADIUS; dx <= COLOR_SAMPLE_RADIUS; dx += 1) {
        const px = Math.min(sourceW - 1, Math.max(0, cx + dx));
        const py = Math.min(sourceH - 1, Math.max(0, cy + dy));
        const idx = (py * sourceW + px) * 4;
        r += pixels[idx];
        g += pixels[idx + 1];
        b += pixels[idx + 2];
        count += 1;
      }
    }

    colors.push(r / count / 255, g / count / 255, b / count / 255);
  }

  return colors;
}

export function buildFaceMeshFromCapture(
  capture: FaceCapture,
  crop: ReturnType<typeof cropFaceForMesh>,
  geometryLandmarks: FaceLandmark[],
  pixels: Uint8ClampedArray,
): FaceScanData {
  const landmarks = geometryLandmarks.slice(0, FACE_LANDMARK_COUNT);
  const colorLandmarks = capture.landmarks.slice(0, FACE_LANDMARK_COUNT);
  const nose = landmarks[1] ?? landmarks[0];
  const scale = eyeDistance(landmarks);

  const vertices: number[] = [];
  const uvs: number[] = [];

  for (let i = 0; i < FACE_LANDMARK_COUNT; i += 1) {
    const point = landmarks[i];
    vertices.push(
      (point.x - nose.x) / scale,
      -(point.y - nose.y) / scale,
      (-point.z * DEPTH_SCALE) / scale,
    );

    const colorPoint = colorLandmarks[i];
    const px = colorPoint.x * crop.sourceW;
    const py = colorPoint.y * crop.sourceH;
    uvs.push(
      (px - crop.cropX) / crop.cropW,
      1 - (py - crop.cropY) / crop.cropH,
    );
  }

  const colors = sampleVertexColors(
    pixels,
    capture.videoWidth,
    capture.videoHeight,
    colorLandmarks,
  );

  return {
    version: 2,
    vertices,
    uvs,
    colors,
    indices: [...FACE_MESH_TRIANGLES],
    photoUrl: crop.photoUrl,
  };
}

export async function buildHeadAvatarFromCaptures(
  captures: FaceCapture[],
): Promise<FaceScanData> {
  if (!captures.length) {
    throw new Error("No face capture provided");
  }

  const front =
    captures.find((capture) => capture.pose === "front") ?? captures[0];
  const left = captures.find((capture) => capture.pose === "left");
  const right = captures.find((capture) => capture.pose === "right");

  const geometryLandmarks = refineDepthFromSideCaptures(
    front.landmarks,
    left?.landmarks,
    right?.landmarks,
  );

  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = front.videoWidth;
    canvas.height = front.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas not available"));
      return;
    }

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, front.videoWidth, front.videoHeight);
      const crop = cropFaceForMesh(canvas, front.landmarks);
      resolve(
        buildFaceMeshFromCapture(
          front,
          crop,
          geometryLandmarks,
          imageData.data,
        ),
      );
    };
    img.onerror = () => reject(new Error("Failed to load capture"));
    img.src = front.photo;
  });
}
