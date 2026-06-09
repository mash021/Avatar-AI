"use client";

import { useCallback, useEffect, useState } from "react";

import { getStoredLanguage, setStoredLanguage } from "@/lib/chat";
import type { ChatLanguage } from "@/types/chat";

export function useLanguage() {
  const [language, setLanguageState] = useState<ChatLanguage>("auto");

  useEffect(() => {
    setLanguageState(getStoredLanguage());
  }, []);

  const setLanguage = useCallback((value: ChatLanguage) => {
    setStoredLanguage(value);
    setLanguageState(value);
  }, []);

  return { language, setLanguage };
}
