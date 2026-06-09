"use client";

import { FormEvent, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUrl, deleteUrl, fetchUrls, scrapeUrl } from "@/lib/api";
import type { UrlItem } from "@/types/admin";

export function UrlManager() {
  const [urls, setUrls] = useState<UrlItem[]>([]);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadUrls() {
    setLoading(true);
    try {
      setUrls(await fetchUrls());
    } catch {
      setError("Failed to load URLs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUrls();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await createUrl({ url, label });
      setUrl("");
      setLabel("");
      await loadUrls();
    } catch {
      setError("Failed to add URL");
    }
  }

  async function handleDelete(id: string) {
    await deleteUrl(id);
    await loadUrls();
  }

  async function handleScrape(id: string) {
    setError("");
    try {
      await scrapeUrl(id);
      await loadUrls();
    } catch {
      setError("Failed to start scrape");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Website URL</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://company.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                placeholder="Company Homepage"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
              />
            </div>
            <div className="flex items-end">
              <Button type="submit">Add URL</Button>
            </div>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Website URLs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : urls.length === 0 ? (
            <p className="text-muted-foreground">No URLs added yet.</p>
          ) : (
            <div className="space-y-3">
              {urls.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.url}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{item.status}</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleScrape(item.id)}
                    >
                      Scrape
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
