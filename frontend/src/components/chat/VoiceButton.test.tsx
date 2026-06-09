import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { VoiceButton } from "./VoiceButton";

describe("VoiceButton", () => {
  it("renders microphone button", () => {
    render(
      <VoiceButton recording={false} processing={false} onClick={vi.fn()} />,
    );
    expect(screen.getByLabelText("Voice")).toBeInTheDocument();
  });

  it("calls onClick when pressed", () => {
    const onClick = vi.fn();
    render(
      <VoiceButton recording={false} processing={false} onClick={onClick} />,
    );
    fireEvent.click(screen.getByLabelText("Voice"));
    expect(onClick).toHaveBeenCalled();
  });

  it("shows stop label while recording", () => {
    render(
      <VoiceButton recording processing={false} onClick={vi.fn()} recordingLabel="Stop" />,
    );
    expect(screen.getByLabelText("Stop")).toBeInTheDocument();
  });
});
