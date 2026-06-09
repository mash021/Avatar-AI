export type ChatLanguage = "auto" | "en" | "ar";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  language: string;
  had_context?: boolean;
  fallback_used?: boolean;
  created_at?: string;
};

export type ChatResponse = {
  session_id: string;
  message_id: string;
  reply: string;
  language: string;
  had_context: boolean;
  fallback_used: boolean;
};

export type ChatSessionDetail = {
  id: string;
  session_token: string;
  language: string;
  started_at: string;
  messages: ChatMessage[];
};

export type ChatSessionSummary = {
  id: string;
  session_token: string;
  language: string;
  message_count: number;
  started_at: string;
  last_message_at: string | null;
};

export type ResponseOverrideItem = {
  id: string;
  original_message_id: string;
  improved_content: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};
