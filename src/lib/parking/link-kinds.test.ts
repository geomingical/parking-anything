import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { ParkingItem } from "./schemas";

import {
  LINK_KINDS,
  LINK_KIND_IDS,
  displayFor,
  isLinkKind,
  reparkSuggestionFor,
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

  // Finding 3: nothing previously bound each registry accentVar to the CSS
  // custom property it names. An undefined --kind-* token makes the whole
  // `border-left` declaration invalid, so the accent band silently vanishes
  // with a fully green suite. Read the actual stylesheet from disk so a
  // drift between the two is caught here instead of in the browser.
  it("defines a CSS custom property for every registry accentVar", () => {
    const css = readFileSync(
      path.join(process.cwd(), "src/app/globals.css"),
      "utf-8",
    );
    const accentVars = [
      ...LINK_KIND_IDS.map((id) => LINK_KINDS[id].accentVar),
      displayFor("idea").accentVar,
    ];

    for (const accentVar of accentVars) {
      expect(css).toMatch(new RegExp(`(^|\\s)${accentVar}\\s*:`));
    }
  });
});

describe("reparkSuggestionFor", () => {
  const tool: ParkingItem = {
    id: "tool-1",
    kind: "ai_tool",
    status: "parked",
    url: "https://example.com/tool",
    title: "Example Tool",
    summary: "A concise description of an AI tool.",
    effortTier: "quick_spin",
    suggestedTestTask: "Try one representative input.",
    usefulnessHypothesis: "Useful if it shortens a repeated task.",
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    lastActivityAt: "2026-07-20T00:00:00.000Z",
  };

  it("offers the suggestion when the model disagrees with the stored kind", () => {
    expect(
      reparkSuggestionFor({
        ...tool,
        suggestedKind: "read" as const,
        kindRationale: "Long-form prose.",
      }),
    ).toEqual({
      kind: "read",
      rationale: "Long-form prose.",
      url: "https://example.com/tool",
    });
  });

  it("offers nothing when the model agrees with the stored kind", () => {
    expect(
      reparkSuggestionFor({ ...tool, suggestedKind: "ai_tool" as const, kindRationale: "Software." }),
    ).toBeNull();
  });

  it("offers nothing when no classification was ever stored", () => {
    expect(reparkSuggestionFor(tool)).toBeNull();
  });

  // An Idea has no URL, so nothing can ever be re-analysed for it.
  it("offers nothing for an Idea", () => {
    expect(
      reparkSuggestionFor({
        id: "idea-1",
        kind: "idea",
        status: "parked",
        title: "Compare onboarding flows",
        ideaText: "Prototype both flows.",
        createdAt: "2026-07-20T00:00:00.000Z",
        updatedAt: "2026-07-20T00:00:00.000Z",
        lastActivityAt: "2026-07-20T00:00:00.000Z",
      }),
    ).toBeNull();
  });

  // Finding 2: a garaged or scrapped item can no longer be re-parked at all
  // (see refuseIfTerminal in use-parking-store.ts), so a mismatched
  // classification must stop being offered the moment an item goes terminal
  // — otherwise the card keeps saying "looks like another kind" with no
  // action reachable anywhere. Gated here, not in each caller, so the card
  // and the inspector cannot drift apart again.
  it.each(["garaged", "scrapped"] as const)(
    "offers nothing for a %s item even when the stored classification still disagrees",
    (status) => {
      expect(
        reparkSuggestionFor({
          ...tool,
          status,
          suggestedKind: "read" as const,
          kindRationale: "Long-form prose.",
        }),
      ).toBeNull();
    },
  );
});
