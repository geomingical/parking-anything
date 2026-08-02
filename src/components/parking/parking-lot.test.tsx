import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { makeSeedItems } from "@/lib/parking/fixtures";
import type { ParkingItem } from "@/lib/parking/schemas";
import { ParkingLot } from "./parking-lot";
import { StatusTabs } from "./status-tabs";

describe("ParkingLot", () => {
  it("renders every car as an accessible button with a visible text status", () => {
    render(<ParkingLot items={makeSeedItems()} onSelect={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /OpenAI Platform Docs, Parked/i }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /OpenAI Node SDK, Test Driving/i })).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Structured Outputs Guide, Garaged/i }),
    ).toBeVisible();
    expect(screen.getAllByText(/^Tool ·/)).toHaveLength(3);
    expect(screen.queryByText(/Meetups|Travel|Ideas/i)).not.toBeInTheDocument();
  });

  it("renders an unplanned Idea neutrally with deterministic review age", () => {
    const idea: ParkingItem = {
      id: "idea-stale",
      kind: "idea",
      status: "parked",
      title: "Compare onboarding flows",
      ideaText: "Prototype both flows.",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
      lastActivityAt: "2026-07-13T00:00:00.000Z",
    };

    render(
      <ParkingLot
        items={[idea, { ...makeSeedItems()[0], id: "fresh", lastActivityAt: "2026-07-19T00:00:00.000Z" }]}
        onSelect={vi.fn()}
        now={new Date("2026-07-20T00:00:00.000Z")}
      />,
    );

    expect(screen.getByText("Idea")).toBeVisible();
    // The lot is filtered by status, so the card must not repeat it.
    expect(screen.queryByText(/Parked/)).not.toBeInTheDocument();
    expect(screen.getByText("Planning needed")).toBeVisible();
    expect(screen.getByText("Needs review · 7 days")).toBeVisible();
    expect(screen.queryByText("Needs review · 1 day")).not.toBeInTheDocument();
  });

  it("shows an unframed empty-filter message when no cars match", () => {
    render(<ParkingLot items={[]} onSelect={vi.fn()} />);

    expect(screen.getByText("No cars are waiting in this zone.")).toBeVisible();
  });

  it("labels a read with its own kind wording and accent", () => {
    const read = {
      id: "read-1",
      kind: "read" as const,
      status: "parked" as const,
      url: "https://example.com/article",
      title: "On interface craft",
      summary: "Argues small details compound.",
      effortTier: "focused_session" as const,
      suggestedTestTask: "Pick one detail.",
      usefulnessHypothesis: "May sharpen the next pass.",
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
      lastActivityAt: "2026-07-30T00:00:00.000Z",
    };

    render(<ParkingLot items={[read]} onSelect={vi.fn()} now={new Date("2026-07-30T00:00:00.000Z")} />);

    expect(screen.getByText("Read · Careful read")).toBeVisible();
    // jsdom does not resolve CSS custom properties through toHaveStyle, so assert the
    // inline style attribute directly — otherwise this fails for the wrong reason.
    expect(
      screen.getByRole("button", { name: "On interface craft, Parked" }).getAttribute("style"),
    ).toContain("--kind-accent: var(--kind-read)");
  });

  // The model's opinion now travels ON the item, so the card can show it —
  // no floating advisory chasing the item from somewhere else in the tree.
  describe("kind suggestion marker", () => {
    const tool = {
      id: "tool-1",
      kind: "ai_tool" as const,
      status: "parked" as const,
      url: "https://example.com/article",
      title: "On interface craft",
      summary: "Argues small details compound.",
      effortTier: "focused_session" as const,
      suggestedTestTask: "Pick one detail.",
      usefulnessHypothesis: "May sharpen the next pass.",
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
      lastActivityAt: "2026-07-30T00:00:00.000Z",
    };

    function renderCard(item: ParkingItem) {
      render(
        <ParkingLot items={[item]} onSelect={vi.fn()} now={new Date("2026-07-30T00:00:00.000Z")} />,
      );
    }

    it("marks a card whose stored suggestion differs from its kind", () => {
      renderCard({ ...tool, suggestedKind: "read" as const, kindRationale: "Long-form prose." });

      expect(screen.getByText("Looks like a read")).toBeVisible();
    });

    it("does not mark a card whose stored suggestion agrees", () => {
      renderCard({ ...tool, suggestedKind: "ai_tool" as const, kindRationale: "Software." });

      expect(screen.queryByText(/Looks like a/)).not.toBeInTheDocument();
    });

    it("does not mark a card that was never classified", () => {
      renderCard(tool);

      expect(screen.queryByText(/Looks like a/)).not.toBeInTheDocument();
    });

    // Many tests and every e2e journey depend on this exact accessible name;
    // the marker is visible content inside the button, never part of it.
    it("leaves the card's accessible name untouched", () => {
      renderCard({ ...tool, suggestedKind: "read" as const, kindRationale: "Long-form prose." });

      expect(
        screen.getByRole("button", { name: "On interface craft, Parked" }),
      ).toBeVisible();
    });

    // Finding 3: before the refactor the suggestion was pushed at the user
    // right after parking; now it lives behind opening a card. A sighted
    // user has the visual marker, but a screen-reader user hears only
    // "Title, Parked" and would have to open every card to discover a
    // correction exists. aria-describedby exposes it without touching the
    // accessible NAME, which many other tests and every e2e spec match on.
    it("exposes the suggestion to screen readers via aria-describedby, saying what it is and what to do", () => {
      renderCard({ ...tool, suggestedKind: "read" as const, kindRationale: "Long-form prose." });

      const button = screen.getByRole("button", { name: "On interface craft, Parked" });
      const describedById = button.getAttribute("aria-describedby");
      expect(describedById).toBeTruthy();
      const description = document.getElementById(describedById!);
      expect(description).not.toBeNull();
      expect(description).toHaveTextContent(/read/i);
      expect(description).toHaveTextContent(/re-park/i);
    });

    it("has no aria-describedby when there is no suggestion to announce", () => {
      renderCard(tool);

      expect(
        screen.getByRole("button", { name: "On interface craft, Parked" }),
      ).not.toHaveAttribute("aria-describedby");
    });

    // Finding 2, verified again from the card's own accessibility surface:
    // a terminal item must not describe a suggestion nobody can act on.
    it.each(["garaged", "scrapped"] as const)(
      "has no aria-describedby for a terminal %s item even with a stored mismatch",
      (status) => {
        renderCard({ ...tool, status, suggestedKind: "read" as const, kindRationale: "Long-form prose." });

        const label = status === "garaged" ? "Garaged" : "Scrapped";
        expect(
          screen.getByRole("button", { name: `On interface craft, ${label}` }),
        ).not.toHaveAttribute("aria-describedby");
      },
    );
  });
});

describe("StatusTabs", () => {
  it("renders stable status filter labels with counts", () => {
    render(
      <StatusTabs
        activeStatus="parked"
        counts={{ parked: 1, test_driving: 1, garaged: 1, scrapped: 0 }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("tab", { name: "Parking Lot 1" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Test Driving 1" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Garage 1" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Scrapyard 0" })).toBeVisible();
  });
});
