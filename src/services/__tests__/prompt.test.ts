import { describe, expect, it } from "vitest";
import { buildGroundedPrompt } from "../prompt";

describe("buildGroundedPrompt", () => {
  it("includes question and chunk context", () => {
    const prompt = buildGroundedPrompt("What is the leave policy?", [
      {
        id: "chunk_1",
        documentId: "doc_1",
        title: "HR Handbook",
        source: "upload",
        content: "Employees have 15 days of annual leave.",
        score: 0.95,
      },
    ]);

    expect(prompt).toContain("Question: What is the leave policy?");
    expect(prompt).toContain("HR Handbook");
    expect(prompt).toContain("[1]");
  });
});
