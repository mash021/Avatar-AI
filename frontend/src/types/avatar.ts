export type AvatarPublicConfig = {
  is_enabled: boolean;
  provider: string;
  supports_stream: boolean;
};

export type AvatarSession = {
  session_id: string;
  provider: string;
  stream_url: string | null;
  is_enabled: boolean;
};

export type AvatarSpeakResponse = {
  session_id: string;
  task_id: string | null;
  status: string;
  stream_url: string | null;
  has_audio: boolean;
};

export type AvatarConfigItem = {
  id: string;
  provider: string;
  is_enabled: boolean;
  provider_config: Record<string, string>;
  updated_at: string;
  has_api_key: boolean;
};
