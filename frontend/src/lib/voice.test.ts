import { describe, expect, it } from "vitest";

import { getSpeakableText } from "./voice";

describe("getSpeakableText", () => {
  it("extracts English from bilingual content", () => {
    const text = 'EN: "Hello world"\nAR: "مرحباً"';
    expect(getSpeakableText(text, "en")).toBe("Hello world");
  });

  it("extracts Arabic from bilingual content", () => {
    const text = 'EN: "Hello world"\nAR: "مرحباً بالعالم"';
    expect(getSpeakableText(text, "ar")).toBe("مرحباً بالعالم");
  });

  it("returns original text when no bilingual markers", () => {
    expect(getSpeakableText("Plain answer", "en")).toBe("Plain answer");
  });
});
