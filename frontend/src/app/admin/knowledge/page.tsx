"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchKnowledgeChunks } from "@/lib/api";
import type { KnowledgeChunkItem } from "@/types/admin";

export default function AdminKnowledgePage() {
  const [chunks, setChunks] = useState<KnowledgeChunkItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadChunks(query = "") {
    setLoading(true);
    try {
      setChunks(await fetchKnowledgeChunks(query || undefined));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChunks();
  }, []);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Knowledge Base</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Browse Chunks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search chunks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="button"
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
              onClick={() => loadChunks(search)}
            >
              Search
            </button>
          </div>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : chunks.length === 0 ? (
            <p className="text-muted-foreground">No knowledge chunks found.</p>
          ) : (
            <div className="space-y-3">
              {chunks.map((chunk) => (
                <div key={chunk.id} className="rounded-md border p-3">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge variant="secondary">{chunk.source_type}</Badge>
                    <Badge variant="secondary">{chunk.language}</Badge>
                    {chunk.has_embedding && (
                      <Badge variant="success">embedded</Badge>
                    )}
                    {!chunk.is_active && (
                      <Badge variant="destructive">inactive</Badge>
                    )}
                  </div>
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {chunk.content}
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
