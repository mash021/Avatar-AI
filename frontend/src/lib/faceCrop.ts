import type { FaceLandmark } from "@/lib/faceScan";

const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
  378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
  162, 21, 54, 103, 67, 109,
];

const OUTPUT_SIZE = 1024;

export type FaceCropResult = {
  photoUrl: string;
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  sourceW: number;
  sourceH: number;
};

export function getFaceCropBounds(
  landmarks: FaceLandmark[],
  sourceW: number,
  sourceH: number,
) {
  const ovalPoints = FACE_OVAL.map((index) => landmarks[index]).filter(Boolean);
  if (ovalPoints.length < 4) {
    return {
      cropX: 0,
      cropY: 0,
      cropW: sourceW,
      cropH: sourceH,
    };
  }

  const xs = ovalPoints.map((point) => point.x * sourceW);
  const ys = ovalPoints.map((point) => point.y * sourceH);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const size = Math.ceil(Math.max(maxX - minX, maxY - minY) * 1.45);
  const cropX = Math.max(0, Math.floor(cx - size / 2));
  const cropY = Math.max(0, Math.floor(cy - size / 2));
  const cropW = Math.min(size, sourceW - cropX);
  const cropH = Math.min(size, sourceH - cropY);

  return { cropX, cropY, cropW, cropH };
}

export function cropFaceForMesh(
  source: HTMLCanvasElement,
  landmarks: FaceLandmark[],
): FaceCropResult {
  const sourceW = source.width;
  const sourceH = source.height;
  const bounds = getFaceCropBounds(landmarks, sourceW, sourceH);

  const out = document.createElement("canvas");
  out.width = OUTPUT_SIZE;
  out.height = OUTPUT_SIZE;
  const ctx = out.getContext("2d");
  if (!ctx) {
    return {
      photoUrl: source.toDataURL("image/png", 0.9),
      ...bounds,
      sourceW,
      sourceH,
    };
  }

  ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  ctx.drawImage(
    source,
    bounds.cropX,
    bounds.cropY,
    bounds.cropW,
    bounds.cropH,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  );

  return {
    photoUrl: out.toDataURL("image/png", 0.9),
    cropX: bounds.cropX,
    cropY: bounds.cropY,
    cropW: bounds.cropW,
    cropH: bounds.cropH,
    sourceW,
    sourceH,
  };
}
