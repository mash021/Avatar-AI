import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./auth";
import type { AvatarConfigItem } from "@/types/avatar";
import type {
  ChatSessionDetail,
  ChatSessionSummary,
  DashboardStats,
  DocumentItem,
  JobItem,
  KnowledgeChunkItem,
  ResponseOverrideItem,
  TokenResponse,
  UrlItem,
  UserResponse,
} from "@/types/admin";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export type HealthResponse = {
  status: string;
  service: string;
  environment: string;
  database: string;
};

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (auth) {
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && auth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return apiFetch<T>(path, options, auth);
    }
    clearTokens();
    throw new ApiError("Unauthorized", 401);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new ApiError(error.detail ?? "Request failed", response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!response.ok) return false;
    const data: TokenResponse = await response.json();
    setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

export async function fetchHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/health", {}, false);
}

export async function login(
  email: string,
  password: string,
): Promise<TokenResponse> {
  const data = await apiFetch<TokenResponse>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
    false,
  );
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function fetchMe(): Promise<UserResponse> {
  return apiFetch<UserResponse>("/auth/me");
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>("/admin/dashboard/stats");
}

export async function fetchUrls(): Promise<UrlItem[]> {
  return apiFetch<UrlItem[]>("/admin/urls");
}

export async function createUrl(payload: {
  url: string;
  label: string;
  scrape_depth?: number;
}): Promise<UrlItem> {
  return apiFetch<UrlItem>("/admin/urls", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteUrl(id: string): Promise<void> {
  return apiFetch<void>(`/admin/urls/${id}`, { method: "DELETE" });
}

export async function scrapeUrl(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/admin/urls/${id}/scrape`, {
    method: "POST",
  });
}

export async function fetchDocuments(): Promise<DocumentItem[]> {
  return apiFetch<DocumentItem[]>("/admin/documents");
}

export async function uploadDocument(file: File): Promise<DocumentItem> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<DocumentItem>("/admin/documents", {
    method: "POST",
    body: formData,
  });
}

export async function deleteDocument(id: string): Promise<void> {
  return apiFetch<void>(`/admin/documents/${id}`, { method: "DELETE" });
}

export async function reindexDocument(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/admin/documents/${id}/reindex`, {
    method: "POST",
  });
}

export async function fetchJobs(): Promise<JobItem[]> {
  return apiFetch<JobItem[]>("/admin/jobs");
}

export async function fetchKnowledgeChunks(
  search?: string,
): Promise<KnowledgeChunkItem[]> {
  const params = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiFetch<KnowledgeChunkItem[]>(`/admin/knowledge${params}`);
}

export async function fetchChatLogs(): Promise<ChatSessionSummary[]> {
  return apiFetch<ChatSessionSummary[]>("/admin/chat-logs");
}

export async function fetchChatSessionDetail(
  sessionId: string,
): Promise<ChatSessionDetail> {
  return apiFetch<ChatSessionDetail>(`/admin/chat-logs/${sessionId}`);
}

export async function fetchOverrides(): Promise<ResponseOverrideItem[]> {
  return apiFetch<ResponseOverrideItem[]>("/admin/overrides");
}

export async function createOverride(payload: {
  original_message_id: string;
  improved_content: string;
  notes?: string;
}): Promise<ResponseOverrideItem> {
  return apiFetch<ResponseOverrideItem>("/admin/overrides", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchAdminAvatarConfig(): Promise<AvatarConfigItem> {
  return apiFetch<AvatarConfigItem>("/admin/avatar/config");
}

export async function updateAdminAvatarConfig(payload: {
  provider: string;
  is_enabled: boolean;
  provider_config: Record<string, string>;
}): Promise<AvatarConfigItem> {
  return apiFetch<AvatarConfigItem>("/admin/avatar/config", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export { ApiError };
