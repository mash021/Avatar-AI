import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ChatInput } from "./ChatInput";

describe("ChatInput", () => {
  it("sends message on button click", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    fireEvent.change(screen.getByPlaceholderText("Type your message..."), {
      target: { value: "Hello there" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(onSend).toHaveBeenCalledWith("Hello there");
  });

  it("sends message on Enter key", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const textarea = screen.getByPlaceholderText("Type your message...");
    fireEvent.change(textarea, { target: { value: "Test message" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(onSend).toHaveBeenCalledWith("Test message");
  });
});
