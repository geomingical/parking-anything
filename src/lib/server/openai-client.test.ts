import { describe, expect, it } from "vitest";

import { extractParsedOutput } from "./openai-client";

const validAnalysis = {
  title: "Example Tool",
  summary: "A focused tool summary.",
  effortTier: "quick_spin",
  suggestedTestTask: "Run one sample through the tool.",
  usefulnessHypothesis: "It may shorten a repeated review step.",
};

describe("extractParsedOutput", () => {
  it("returns the first parsed output text from a completed message", () => {
    expect(
      extractParsedOutput({
        status: "completed",
        output: [
          {
            type: "message",
            content: [{ type: "output_text", parsed: validAnalysis }],
          },
        ],
      }),
    ).toEqual(validAnalysis);
  });

  it("rejects an explicit model refusal", () => {
    expect(() =>
      extractParsedOutput({
        status: "completed",
        output: [
          {
            type: "message",
            content: [{ type: "refusal", refusal: "Cannot comply" }],
          },
        ],
      }),
    ).toThrow("The model declined this analysis.");
  });

  it("rejects a completed response without parsed output", () => {
    expect(() =>
      extractParsedOutput({
        status: "completed",
        output: [
          {
            type: "message",
            content: [{ type: "output_text", parsed: null }],
          },
        ],
      }),
    ).toThrow("The model did not return valid structured output.");
  });

  it.each(["incomplete", "failed", "cancelled", "in_progress"])(
    "rejects a non-completed response status: %s",
    (status) => {
      expect(() => extractParsedOutput({ status, output: [] })).toThrow(
        "The model response was incomplete.",
      );
    },
  );
});
