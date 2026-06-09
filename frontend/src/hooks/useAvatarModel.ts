"use client";

import { useCallback, useEffect, useState } from "react";

import {
  AVATAR_GLB_KEY,
  DEFAULT_AVATAR_GLB,
  getStoredAvatarPhoto,
  getStoredFaceScan,
  normalizeGlbUrl,
  resolveAvatarModelUrl,
  setStoredAvatarGlb,
  setStoredFaceScan,
} from "@/lib/avatar3d";
import type { FaceScanData } from "@/lib/faceScan";

export function useAvatarModel() {
  const [glbUrl, setGlbUrl] = useState(DEFAULT_AVATAR_GLB);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [faceScan, setFaceScan] = useState<FaceScanData | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    localStorage.removeItem(AVATAR_GLB_KEY);
    setGlbUrl(DEFAULT_AVATAR_GLB);
    setFaceScan(getStoredFaceScan());
    setPhotoUrl(getStoredAvatarPhoto());
    setReady(true);
  }, []);

  const saveGlbUrl = useCallback((url: string) => {
    const normalized = normalizeGlbUrl(url);
    setStoredAvatarGlb(normalized);
    setGlbUrl(resolveAvatarModelUrl(normalized));
  }, []);

  const saveFaceScan = useCallback((scan: FaceScanData) => {
    setStoredFaceScan(scan);
    setFaceScan(scan);
    setPhotoUrl(scan.photoUrl);
  }, []);

  const clearCustomGlb = useCallback(() => {
    localStorage.removeItem(AVATAR_GLB_KEY);
    setGlbUrl(DEFAULT_AVATAR_GLB);
  }, []);

  return {
    glbUrl,
    photoUrl,
    faceScan,
    ready,
    saveGlbUrl,
    saveFaceScan,
    clearCustomGlb,
  };
}
