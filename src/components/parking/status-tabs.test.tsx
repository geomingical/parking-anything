import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ParkingItemStatus } from "@/lib/parking/schemas";
import { StatusTabs } from "./status-tabs";

const counts: Record<ParkingItemStatus, number> = {
  parked: 1,
  test_driving: 2,
  garaged: 3,
  scrapped: 0,
};

function renderTabs(activeStatus: ParkingItemStatus = "parked") {
  const onChange = vi.fn();
  render(
    <StatusTabs activeStatus={activeStatus} counts={counts} onChange={onChange} />,
  );
  return { onChange };
}

describe("StatusTabs", () => {
  it("exposes a single tab stop across the tab list", () => {
    renderTabs();

    expect(screen.getByRole("tab", { name: "Parking Lot 1" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    for (const name of ["Test Driving 2", "Garage 3", "Scrapyard 0"]) {
      expect(screen.getByRole("tab", { name })).toHaveAttribute("tabindex", "-1");
    }
  });

  it("selects the next tab with ArrowRight", async () => {
    const user = userEvent.setup();
    const { onChange } = renderTabs();

    screen.getByRole("tab", { name: "Parking Lot 1" }).focus();
    await user.keyboard("{ArrowRight}");

    expect(onChange).toHaveBeenCalledWith("test_driving");
  });

  it("wraps from the first tab to the last with ArrowLeft", async () => {
    const user = userEvent.setup();
    const { onChange } = renderTabs();

    screen.getByRole("tab", { name: "Parking Lot 1" }).focus();
    await user.keyboard("{ArrowLeft}");

    expect(onChange).toHaveBeenCalledWith("scrapped");
  });

  it("jumps to the first and last tab with Home and End", async () => {
    const user = userEvent.setup();
    const { onChange } = renderTabs("garaged");

    screen.getByRole("tab", { name: "Garage 3" }).focus();
    await user.keyboard("{End}");
    expect(onChange).toHaveBeenCalledWith("scrapped");

    await user.keyboard("{Home}");
    expect(onChange).toHaveBeenCalledWith("parked");
  });

  it("points each tab at the panel it controls", () => {
    renderTabs();

    expect(screen.getByRole("tab", { name: "Parking Lot 1" })).toHaveAttribute(
      "aria-controls",
    );
  });
});
