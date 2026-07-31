import { describe, expect, it } from "vitest";

import {
  LINK_KINDS,
  LINK_KIND_IDS,
  displayFor,
  isLinkKind,
} from "./link-kinds";

describe("link kinds registry", () => {
  it("registers ai_tool and read", () => {
    expect(LINK_KIND_IDS).toEqual(["ai_tool", "read"]);
  });

  it("gives every kind a complete entry", () => {
    for (const id of LINK_KIND_IDS) {
      const kind = LINK_KINDS[id];
      expect(kind.label.length).toBeGreaterThan(0);
      expect(kind.captureLabel.length).toBeGreaterThan(0);
      expect(kind.noun.length).toBeGreaterThan(0);
      expect(kind.framing.length).toBeGreaterThan(0);
      expect(kind.classifierHint.length).toBeGreaterThan(0);
      expect(kind.urlFieldLabel.length).toBeGreaterThan(0);
      expect(kind.urlPlaceholder.length).toBeGreaterThan(0);
      expect(Object.keys(kind.effortLabels)).toEqual([
        "quick_spin",
        "focused_session",
        "weekend_project",
      ]);
    }
  });

  it("gives each kind its own URL placeholder example", () => {
    expect(LINK_KINDS.ai_tool.urlPlaceholder).toBe("https://example.com/ai-tool");
    expect(LINK_KINDS.read.urlPlaceholder).toBe("https://example.com/article");
  });

  it("keeps kind accents out of the reserved status palette", () => {
    const reserved = ["--safety", "--garage", "--scrap"];
    for (const id of LINK_KIND_IDS) {
      expect(reserved).not.toContain(LINK_KINDS[id].accentVar);
    }
  });

  it("recognises only registered ids as link kinds", () => {
    expect(isLinkKind("read")).toBe(true);
    expect(isLinkKind("idea")).toBe(false);
  });

  it("falls back to an Idea display for the non-link kind", () => {
    expect(displayFor("idea").label).toBe("Idea");
    expect(displayFor("read").label).toBe("Read");
  });
});
