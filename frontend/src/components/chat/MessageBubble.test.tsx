import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MessageBubble } from "./MessageBubble";
import type { ChatMessage } from "@/types/chat";

describe("MessageBubble", () => {
  it("renders user message", () => {
    const message: ChatMessage = {
      id: "1",
      role: "user",
      content: "Hello",
      language: "en",
    };
    render(<MessageBubble message={message} />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("applies RTL for Arabic content", () => {
    const message: ChatMessage = {
      id: "2",
      role: "assistant",
      content: "مرحباً بك",
      language: "ar",
    };
    const { container } = render(<MessageBubble message={message} />);
    expect(container.querySelector('[dir="rtl"]')).toBeInTheDocument();
  });

  it("shows fallback notice for assistant fallback messages", () => {
    const message: ChatMessage = {
      id: "3",
      role: "assistant",
      content: "No info available",
      language: "en",
      fallback_used: true,
    };
    render(<MessageBubble message={message} />);
    expect(screen.getByText("No matching knowledge found")).toBeInTheDocument();
  });
});
