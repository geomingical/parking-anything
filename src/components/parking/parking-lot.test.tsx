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

    expect(screen.getByText(/^Idea ·/)).toBeVisible();
    expect(screen.getByText("Planning needed")).toBeVisible();
    expect(screen.getByText("Needs review · 7 days")).toBeVisible();
    expect(screen.queryByText("Needs review · 1 day")).not.toBeInTheDocument();
  });

  it("shows an unframed empty-filter message when no cars match", () => {
    render(<ParkingLot items={[]} onSelect={vi.fn()} />);

    expect(screen.getByText("No cars are waiting in this zone.")).toBeVisible();
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
