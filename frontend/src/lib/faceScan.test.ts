import { describe, expect, it } from "vitest";

import {
  buildFaceMeshFromCapture,
  getHeadPoseFromLandmarks,
  isPoseMatched,
  type FaceCapture,
  type FaceLandmark,
} from "./faceScan";

function makeBaseLandmarks(): FaceLandmark[] {
  const landmarks = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  landmarks[1] = { x: 0.5, y: 0.55, z: 0 };
  landmarks[33] = { x: 0.42, y: 0.48, z: 0 };
  landmarks[263] = { x: 0.58, y: 0.48, z: 0 };
  landmarks[234] = { x: 0.35, y: 0.55, z: -0.01 };
  landmarks[454] = { x: 0.65, y: 0.55, z: -0.01 };
  landmarks[152] = { x: 0.5, y: 0.72, z: 0 };
  landmarks[10] = { x: 0.5, y: 0.32, z: 0 };
  return landmarks;
}

function makePixels(width: number, height: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 210;
    pixels[i + 1] = 170;
    pixels[i + 2] = 140;
    pixels[i + 3] = 255;
  }
  return pixels;
}

describe("faceScan", () => {
  it("detects front pose", () => {
    const metrics = getHeadPoseFromLandmarks(makeBaseLandmarks());
    expect(isPoseMatched("front", metrics)).toBe(true);
  });

  it("builds a real mesh with vertices, colors, and triangles", () => {
    const landmarks = makeBaseLandmarks();
    const capture: FaceCapture = {
      pose: "front",
      photo: "data:image/png;base64,test",
      landmarks,
      videoWidth: 640,
      videoHeight: 480,
    };

    const mesh = buildFaceMeshFromCapture(
      capture,
      {
        photoUrl: "data:image/png;base64,test",
        cropX: 100,
        cropY: 80,
        cropW: 300,
        cropH: 300,
        sourceW: 640,
        sourceH: 480,
      },
      landmarks,
      makePixels(640, 480),
    );

    expect(mesh.version).toBe(2);
    expect(mesh.vertices.length).toBe(468 * 3);
    expect(mesh.colors.length).toBe(468 * 3);
    expect(mesh.uvs.length).toBe(468 * 2);
    expect(mesh.indices.length).toBeGreaterThan(2000);
  });
});
