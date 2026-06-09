import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MessageContent } from "./MessageContent";

describe("MessageContent", () => {
  it("renders bilingual EN/AR blocks with RTL for Arabic", () => {
    const { container } = render(
      <MessageContent
        content={'EN: "Hello world"\nAR: "مرحباً بالعالم"'}
        chatLanguage="en"
        messageLanguage="en"
      />,
    );

    expect(screen.getByText("Hello world")).toBeInTheDocument();
    expect(screen.getByText("مرحباً بالعالم")).toBeInTheDocument();
    expect(container.querySelector('[dir="rtl"]')).toBeInTheDocument();
  });

  it("renders Arabic-only content as RTL", () => {
    const { container } = render(
      <MessageContent
        content="ساعات العمل من 9 صباحاً"
        chatLanguage="ar"
        messageLanguage="ar"
      />,
    );

    expect(screen.getByText("ساعات العمل من 9 صباحاً")).toBeInTheDocument();
    expect(container.querySelector('[dir="rtl"]')).toBeInTheDocument();
  });
});
