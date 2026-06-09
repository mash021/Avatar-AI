"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchAdminAvatarConfig,
  testAdminAvatar,
  updateAdminAvatarConfig,
} from "@/lib/avatar";

const PROVIDERS = [
  { value: "mock", label: "Mock (TTS visual)" },
  { value: "heygen", label: "HeyGen" },
  { value: "d-id", label: "D-ID (stub)" },
];

export default function AdminAvatarPage() {
  const [provider, setProvider] = useState("mock");
  const [isEnabled, setIsEnabled] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [avatarId, setAvatarId] = useState("default");
  const [voiceIdEn, setVoiceIdEn] = useState("");
  const [voiceIdAr, setVoiceIdAr] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadConfig() {
    setLoading(true);
    try {
      const config = await fetchAdminAvatarConfig();
      setProvider(config.provider);
      setIsEnabled(config.is_enabled);
      setAvatarId(config.provider_config.avatar_id ?? "default");
      setVoiceIdEn(config.provider_config.voice_id_en ?? "");
      setVoiceIdAr(config.provider_config.voice_id_ar ?? "");
      setHasApiKey(config.has_api_key);
      setApiKey("");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfig();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const providerConfig: Record<string, string> = {
        avatar_id: avatarId,
        voice_id_en: voiceIdEn,
        voice_id_ar: voiceIdAr,
      };
      if (apiKey.trim()) {
        providerConfig.api_key = apiKey.trim();
      } else if (hasApiKey) {
        providerConfig.api_key = "***";
      }

      await updateAdminAvatarConfig({
        provider,
        is_enabled: isEnabled,
        provider_config: providerConfig,
      });
      setMessage("Avatar settings saved.");
      await loadConfig();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setMessage(null);
    try {
      const blob = await testAdminAvatar({
        text: "Hello, I am your company assistant.",
        language: "en",
      });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await audio.play();
      setMessage("Test audio played successfully.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Loading avatar settings...</p>;
  }

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Avatar Settings</h1>
        <p className="text-muted-foreground">
          Configure the visual assistant provider for the chat page.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Provider</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              id="avatar-enabled"
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
            />
            <Label htmlFor="avatar-enabled">Enable avatar on chat page</Label>
          </div>

          <div>
            <Label htmlFor="avatar-provider">Provider</Label>
            <select
              id="avatar-provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {PROVIDERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="avatar-id">Avatar ID / Presenter</Label>
            <Input
              id="avatar-id"
              value={avatarId}
              onChange={(e) => setAvatarId(e.target.value)}
              placeholder="default or HeyGen avatar ID"
            />
          </div>

          <div>
            <Label htmlFor="api-key">
              API Key {hasApiKey && !apiKey ? "(saved — leave blank to keep)" : ""}
            </Label>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="HeyGen API key"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="voice-en">Voice ID (EN)</Label>
              <Input
                id="voice-en"
                value={voiceIdEn}
                onChange={(e) => setVoiceIdEn(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="voice-ar">Voice ID (AR)</Label>
              <Input
                id="voice-ar"
                value={voiceIdAr}
                onChange={(e) => setVoiceIdAr(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing || !isEnabled}>
              {testing ? "Testing..." : "Test Preview"}
            </Button>
          </div>

          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>
    </section>
  );
}
