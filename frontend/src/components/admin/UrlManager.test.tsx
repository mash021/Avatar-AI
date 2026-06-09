import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UrlManager } from "./UrlManager";

vi.mock("@/lib/api", () => ({
  fetchUrls: vi.fn().mockResolvedValue([
    {
      id: "1",
      url: "https://example.com",
      label: "Example",
      scrape_depth: 1,
      last_scraped_at: null,
      status: "active",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    },
  ]),
  createUrl: vi.fn(),
  deleteUrl: vi.fn(),
}));

describe("UrlManager", () => {
  it("renders URL list after loading", async () => {
    render(<UrlManager />);
    await waitFor(() => {
      expect(screen.getByText("Example")).toBeInTheDocument();
      expect(screen.getByText("https://example.com")).toBeInTheDocument();
    });
  });

  it("renders add URL form", () => {
    render(<UrlManager />);
    expect(screen.getByLabelText("URL")).toBeInTheDocument();
    expect(screen.getByLabelText("Label")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add URL" })).toBeInTheDocument();
  });
});
