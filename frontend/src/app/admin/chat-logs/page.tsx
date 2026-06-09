"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createOverride,
  fetchChatLogs,
  fetchChatSessionDetail,
  fetchOverrides,
} from "@/lib/api";
import type {
  ChatSessionDetail,
  ChatSessionSummary,
  ResponseOverrideItem,
} from "@/types/admin";

export default function AdminChatLogsPage() {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSessionDetail | null>(null);
  const [overrides, setOverrides] = useState<ResponseOverrideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [overrideMessageId, setOverrideMessageId] = useState("");
  const [overrideContent, setOverrideContent] = useState("");
  const [overrideNotes, setOverrideNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [logs, overrideList] = await Promise.all([
        fetchChatLogs(),
        fetchOverrides(),
      ]);
      setSessions(logs);
      setOverrides(overrideList);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function openSession(sessionId: string) {
    const detail = await fetchChatSessionDetail(sessionId);
    setSelectedSession(detail);
    setOverrideMessageId("");
    setOverrideContent("");
    setOverrideNotes("");
  }

  async function handleCreateOverride() {
    if (!overrideMessageId || overrideContent.trim().length < 10) return;
    setSaving(true);
    try {
      await createOverride({
        original_message_id: overrideMessageId,
        improved_content: overrideContent.trim(),
        notes: overrideNotes.trim() || undefined,
      });
      setOverrides(await fetchOverrides());
      setOverrideMessageId("");
      setOverrideContent("");
      setOverrideNotes("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Chat Logs</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : sessions.length === 0 ? (
              <p className="text-muted-foreground">No chat sessions yet.</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => openSession(session.id)}
                    className="w-full rounded-md border p-3 text-left hover:bg-accent"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs">{session.session_token}</span>
                      <Badge variant="secondary">{session.message_count} msgs</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(session.started_at).toLocaleString()} · {session.language}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Session Detail</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedSession ? (
              <p className="text-muted-foreground">Select a session to view messages.</p>
            ) : (
              <div className="space-y-3">
                {selectedSession.messages.map((msg) => (
                  <div key={msg.id} className="rounded-md border p-3">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge variant={msg.role === "user" ? "default" : "secondary"}>
                        {msg.role}
                      </Badge>
                      {msg.fallback_used && (
                        <Badge variant="warning">fallback</Badge>
                      )}
                      {msg.role === "assistant" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setOverrideMessageId(msg.id);
                            setOverrideContent(msg.content);
                          }}
                        >
                          Improve
                        </Button>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      ID: {msg.id}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create Response Override</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="override-message-id">Message ID</Label>
            <Input
              id="override-message-id"
              value={overrideMessageId}
              onChange={(e) => setOverrideMessageId(e.target.value)}
              placeholder="Assistant message UUID"
            />
          </div>
          <div>
            <Label htmlFor="override-content">Improved Content</Label>
            <textarea
              id="override-content"
              value={overrideContent}
              onChange={(e) => setOverrideContent(e.target.value)}
              rows={4}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Corrected answer for future similar questions"
            />
          </div>
          <div>
            <Label htmlFor="override-notes">Notes (optional)</Label>
            <Input
              id="override-notes"
              value={overrideNotes}
              onChange={(e) => setOverrideNotes(e.target.value)}
              placeholder="Keywords or context notes"
            />
          </div>
          <Button onClick={handleCreateOverride} disabled={saving}>
            {saving ? "Saving..." : "Save Override"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Overrides</CardTitle>
        </CardHeader>
        <CardContent>
          {overrides.length === 0 ? (
            <p className="text-muted-foreground">No overrides yet.</p>
          ) : (
            <div className="space-y-3">
              {overrides.map((override) => (
                <div key={override.id} className="rounded-md border p-3">
                  <p className="whitespace-pre-wrap text-sm">{override.improved_content}</p>
                  {override.notes && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Notes: {override.notes}
                    </p>
                  )}
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    Message: {override.original_message_id}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
