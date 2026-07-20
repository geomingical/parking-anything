import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { makeSeedItems } from "@/lib/parking/fixtures";
import type { ParkingItem } from "@/lib/parking/schemas";
import { ItemInspector } from "./item-inspector";

const evidenceFreeDrive: ParkingItem = {
  ...makeSeedItems()[0],
  status: "test_driving",
  testStartedAt: "2026-07-20T00:00:00.000Z",
};

function renderInspector(
  item: ParkingItem,
  onApplyAction = vi.fn().mockReturnValue({ ok: true }),
) {
  return {
    onApplyAction,
    ...render(
      <ItemInspector
        item={item}
        open
        onOpenChange={vi.fn()}
        onApplyAction={onApplyAction}
        onUpdateEvidence={vi.fn()}
      />,
    ),
  };
}

describe("ItemInspector", () => {
  it("shows inline Garage validation and preserves draft fields", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn().mockReturnValue({
      ok: false,
      message: "Add a note or result link before parking in the Garage.",
    });
    renderInspector(evidenceFreeDrive, onApplyAction);

    await user.click(screen.getByRole("button", { name: "Park in Garage" }));

    expect(
      screen.getByText("Add a note or result link before parking in the Garage."),
    ).toBeVisible();
    expect(screen.getByLabelText("Test notes")).toHaveValue("");
    expect(screen.getByLabelText("Result or repository URL")).toHaveValue("");
  });

  it("requires a decision reason in the Tow Away confirmation", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn().mockReturnValue({
      ok: false,
      message: "Record why this tool is leaving before towing it away.",
    });
    renderInspector(makeSeedItems()[0], onApplyAction);

    await user.click(screen.getByRole("button", { name: "Tow Away" }));
    await user.click(screen.getByRole("button", { name: "Confirm Tow Away" }));

    expect(
      screen.getByText("Record why this tool is leaving before towing it away."),
    ).toBeVisible();
    expect(screen.getByLabelText("Decision reason")).toHaveValue("");
  });

  it("submits recorded evidence when parking in the Garage", async () => {
    const user = userEvent.setup();
    const { onApplyAction } = renderInspector(evidenceFreeDrive);

    await user.type(screen.getByLabelText("Test notes"), "Completed the first test.");
    await user.click(screen.getByRole("button", { name: "Park in Garage" }));

    expect(onApplyAction).toHaveBeenCalledWith({
      type: "park_in_garage",
      notes: "Completed the first test.",
      repoUrl: "",
    });
  });

  it.each(["garaged", "scrapped"] as const)(
    "offers no state-changing actions for %s items",
    (status) => {
      renderInspector({ ...makeSeedItems()[2], status });

      expect(screen.queryByRole("button", { name: "Start Test Drive" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Return to Parking Lot" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Park in Garage" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Tow Away" })).not.toBeInTheDocument();
    },
  );
});
