"use client";

import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteDocument,
  fetchDocuments,
  reindexDocument,
  uploadDocument,
} from "@/lib/api";
import type { DocumentItem } from "@/types/admin";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusVariant(status: string) {
  if (status === "indexed") return "success" as const;
  if (status === "failed") return "destructive" as const;
  if (status === "processing") return "warning" as const;
  return "secondary" as const;
}

export function DocumentUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function loadDocuments() {
    try {
      setDocuments(await fetchDocuments());
    } catch {
      setError("Failed to load documents");
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    setError("");
    setUploading(true);
    try {
      await uploadDocument(file);
      await loadDocuments();
    } catch {
      setError("Upload failed. Only PDF, DOCX, XLSX allowed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteDocument(id);
    await loadDocuments();
  }

  async function handleReindex(id: string) {
    setError("");
    try {
      await reindexDocument(id);
      await loadDocuments();
    } catch {
      setError("Failed to start reindex");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upload Document</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            role="button"
            tabIndex={0}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
              dragging ? "border-primary bg-accent" : "border-muted"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          >
            <p className="text-sm text-muted-foreground">
              Drag and drop a file here, or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, DOCX, XLSX — max 50 MB
            </p>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={ALLOWED_TYPES.join(",")}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
          {uploading && (
            <p className="mt-2 text-sm text-muted-foreground">Uploading...</p>
          )}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Uploaded Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-muted-foreground">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{doc.filename}</p>
                    <p className="text-sm text-muted-foreground">
                      {doc.file_type.toUpperCase()} — {formatSize(doc.file_size_bytes)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(doc.status)}>{doc.status}</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReindex(doc.id)}
                    >
                      Reindex
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
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
