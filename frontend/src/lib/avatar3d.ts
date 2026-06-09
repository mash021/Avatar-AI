import type { FaceScanData } from "@/lib/faceScan";

export const AVATAR_GLB_KEY = "avatar_3d_glb_url";
export const AVATAR_PHOTO_KEY = "avatar_3d_photo";
export const AVATAR_FACE_SCAN_KEY = "avatar_face_scan";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

/** Bundled local model — works without external CDN access. */
export const DEFAULT_AVATAR_GLB = "/models/default-avatar.glb";

export const RPM_CREATOR_URL = "https://demo.readyplayer.me/avatar?frameApi";

const LEGACY_BROKEN_URLS = [
  "models.readyplayer.me/64bfa15f0e72c63d7c3934a6",
];

export type HeadPose = {
  yaw: number;
  pitch: number;
  roll: number;
};

export function getStoredAvatarGlb(): string | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(AVATAR_GLB_KEY);
  if (!stored) return null;
  if (LEGACY_BROKEN_URLS.some((fragment) => stored.includes(fragment))) {
    localStorage.removeItem(AVATAR_GLB_KEY);
    return null;
  }
  return stored;
}

export function setStoredAvatarGlb(url: string): void {
  localStorage.setItem(AVATAR_GLB_KEY, url);
}

export function getStoredAvatarPhoto(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AVATAR_PHOTO_KEY);
}

export function setStoredAvatarPhoto(dataUrl: string): void {
  localStorage.setItem(AVATAR_PHOTO_KEY, dataUrl);
}

export function getStoredFaceScan(): FaceScanData | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AVATAR_FACE_SCAN_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FaceScanData;
    if (
      parsed.version !== 2 ||
      !parsed.photoUrl ||
      !parsed.vertices?.length ||
      !parsed.indices?.length ||
      !parsed.colors?.length ||
      parsed.colors.length !== parsed.vertices.length
    ) {
      localStorage.removeItem(AVATAR_FACE_SCAN_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(AVATAR_FACE_SCAN_KEY);
    return null;
  }
}

export function setStoredFaceScan(scan: FaceScanData): void {
  localStorage.setItem(AVATAR_FACE_SCAN_KEY, JSON.stringify(scan));
  setStoredAvatarPhoto(scan.photoUrl);
}

export function clearStoredFaceScan(): void {
  localStorage.removeItem(AVATAR_FACE_SCAN_KEY);
}

function stripQuery(url: string): string {
  return url.split("?")[0] ?? url;
}

export function normalizeGlbUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return DEFAULT_AVATAR_GLB;
  if (trimmed.startsWith("/")) return trimmed;

  const base = stripQuery(trimmed);
  const withGlb = base.endsWith(".glb") ? base : `${base}.glb`;
  const withMorph = `${withGlb}?morphTargets=ARKit&textureAtlas=1024`;
  return resolveAvatarModelUrl(withMorph);
}

/** Route external GLB URLs through the backend proxy to avoid CORS/DNS blocks. */
export function resolveAvatarModelUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("/")) return trimmed || DEFAULT_AVATAR_GLB;

  try {
    const parsed = new URL(trimmed);
    const isExternal =
      parsed.protocol === "https:" || parsed.protocol === "http:";
    if (!isExternal) return DEFAULT_AVATAR_GLB;

    const host = parsed.hostname.toLowerCase();
    const allowed =
      host === "models.readyplayer.me" || host.endsWith(".readyplayer.me");
    if (!allowed) return trimmed;

    return `${API_BASE_URL}/avatar/model?url=${encodeURIComponent(trimmed)}`;
  } catch {
    return DEFAULT_AVATAR_GLB;
  }
}
