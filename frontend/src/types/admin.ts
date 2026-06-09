export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type UserResponse = {
  id: string;
  email: string;
  full_name: string;
  role: string;
};

export type UrlItem = {
  id: string;
  url: string;
  label: string;
  scrape_depth: number;
  last_scraped_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type DocumentItem = {
  id: string;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  status: string;
  error_message: string | null;
  page_count: number | null;
  created_at: string;
  updated_at: string;
  job_id: string | null;
};

export type JobItem = {
  id: string;
  source_type: string;
  source_id: string;
  status: string;
  progress_pct: number;
  chunks_created: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type ChatSessionSummary = {
  id: string;
  session_token: string;
  language: string;
  message_count: number;
  started_at: string;
  last_message_at: string | null;
};

export type ChatMessageLog = {
  id: string;
  role: string;
  content: string;
  language: string;
  had_context: boolean;
  fallback_used: boolean;
  created_at: string;
};

export type ChatSessionDetail = {
  id: string;
  session_token: string;
  language: string;
  started_at: string;
  messages: ChatMessageLog[];
};

export type ResponseOverrideItem = {
  id: string;
  original_message_id: string;
  improved_content: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

export type KnowledgeChunkItem = {
  id: string;
  source_type: string;
  source_id: string;
  source_url: string | null;
  source_page: number | null;
  content: string;
  content_hash: string;
  token_count: number;
  language: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  has_embedding: boolean;
  created_at: string;
};

export type DashboardStats = {
  total_urls: number;
  total_documents: number;
  active_jobs: number;
  failed_jobs: number;
  completed_jobs: number;
};
