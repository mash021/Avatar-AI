import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LanguageToggle } from "./LanguageToggle";

describe("LanguageToggle", () => {
  it("renders language options", () => {
    render(<LanguageToggle value="auto" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Auto" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "EN" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AR" })).toBeInTheDocument();
  });

  it("calls onChange when option clicked", () => {
    const onChange = vi.fn();
    render(<LanguageToggle value="auto" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "AR" }));
    expect(onChange).toHaveBeenCalledWith("ar");
  });
});
