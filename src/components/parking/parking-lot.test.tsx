import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { makeSeedItems } from "@/lib/parking/fixtures";
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
    expect(screen.getByText("Parked")).toBeVisible();
    expect(screen.queryByText(/Meetups|Travel|Ideas/i)).not.toBeInTheDocument();
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
