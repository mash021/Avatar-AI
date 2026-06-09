import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DocumentUpload } from "./DocumentUpload";

vi.mock("@/lib/api", () => ({
  fetchDocuments: vi.fn().mockResolvedValue([
    {
      id: "1",
      filename: "brochure.pdf",
      file_type: "pdf",
      file_size_bytes: 1024,
      status: "uploaded",
      error_message: null,
      page_count: null,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      job_id: "job-1",
    },
  ]),
  uploadDocument: vi.fn(),
  deleteDocument: vi.fn(),
}));

describe("DocumentUpload", () => {
  it("renders upload drop zone", () => {
    render(<DocumentUpload />);
    expect(
      screen.getByText("Drag and drop a file here, or click to browse"),
    ).toBeInTheDocument();
  });

  it("renders document list after loading", async () => {
    render(<DocumentUpload />);
    await waitFor(() => {
      expect(screen.getByText("brochure.pdf")).toBeInTheDocument();
      expect(screen.getByText("uploaded")).toBeInTheDocument();
    });
  });
});
