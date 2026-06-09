import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AvatarPanel } from "./AvatarPanel";

describe("AvatarPanel", () => {
  it("shows disabled state", () => {
    render(
      <AvatarPanel
        isEnabled={false}
        loading={false}
        speaking={false}
        supportsStream={false}
        session={null}
      />,
    );
    expect(screen.getByText("Avatar disabled")).toBeInTheDocument();
  });

  it("shows visual assistant when enabled", () => {
    render(
      <AvatarPanel
        isEnabled
        loading={false}
        speaking={false}
        supportsStream={false}
        session={{
          session_id: "abc",
          provider: "mock",
          stream_url: null,
          is_enabled: true,
        }}
      />,
    );
    expect(screen.getByText("3D Visual Assistant")).toBeInTheDocument();
    expect(screen.getByText("Scan your face with camera")).toBeInTheDocument();
  });
});
