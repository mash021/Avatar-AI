import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchHealth } from "./api";

describe("fetchHealth", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns health data on success", async () => {
    const mockData = {
      status: "ok",
      service: "AI Avatar API",
      environment: "development",
      database: "connected",
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      }),
    );

    const result = await fetchHealth();
    expect(result).toEqual(mockData);
  });

  it("throws on failed response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ detail: "Service unavailable" }),
      }),
    );

    await expect(fetchHealth()).rejects.toThrow("Service unavailable");
  });
});
