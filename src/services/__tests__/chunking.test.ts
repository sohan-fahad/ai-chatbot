import { describe, expect, it } from "vitest";
import { chunkText } from "../chunking";

describe("chunkText", () => {
  it("splits long text into multiple chunks", () => {
    const longText = Array.from({ length: 1400 }, (_, i) => `word${i}`).join(" ");
    const chunks = chunkText(longText, {
      targetTokens: 500,
      maxTokens: 800,
      overlapTokens: 50,
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].tokenCount).toBeGreaterThan(0);
  });

  it("throws when target tokens are less than overlap", () => {
    expect(() =>
      chunkText("alpha beta gamma", {
        targetTokens: 40,
        overlapTokens: 50,
      }),
    ).toThrow();
  });
});
