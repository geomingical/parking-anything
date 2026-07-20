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
  onUpdateEvidence = vi.fn().mockReturnValue({ ok: true }),
) {
  return {
    onApplyAction,
    onUpdateEvidence,
    ...render(
      <ItemInspector
        item={item}
        open
        onOpenChange={vi.fn()}
        onApplyAction={onApplyAction}
        onUpdateEvidence={onUpdateEvidence}
        onUpdateIdea={vi.fn().mockReturnValue({ ok: true })}
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
    expect(screen.getByLabelText("Result URL")).toHaveValue("");
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
      resultUrl: "",
    });
  });

  it("renders Idea content without Tool-only analysis fields", () => {
    const idea: ParkingItem = {
      id: "idea-1",
      kind: "idea",
      status: "parked",
      title: "Compare onboarding flows",
      ideaText: "Prototype both flows with five users.",
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-20T00:00:00.000Z",
      lastActivityAt: "2026-07-20T00:00:00.000Z",
    };

    renderInspector(idea);

    expect(screen.getByDisplayValue(idea.ideaText)).toBeVisible();
    expect(screen.getByText("Planning needed")).toBeVisible();
    expect(screen.queryByText("What it appears to do")).not.toBeInTheDocument();
    expect(screen.queryByText("Usefulness hypothesis")).not.toBeInTheDocument();
  });

  it("edits evidence for a parked Idea while preserving parked Tool behavior", async () => {
    const user = userEvent.setup();
    const idea: ParkingItem = {
      id: "idea-evidence",
      kind: "idea",
      status: "parked",
      title: "Capture evidence early",
      ideaText: "Record useful context before a formal test starts.",
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-20T00:00:00.000Z",
      lastActivityAt: "2026-07-20T00:00:00.000Z",
    };
    const { onUpdateEvidence, unmount } = renderInspector(idea);

    await user.type(screen.getByLabelText("Test notes"), "Early supporting evidence.");
    await user.tab();

    expect(onUpdateEvidence).toHaveBeenCalledWith("Early supporting evidence.", "");
    expect(screen.getByLabelText("Result URL")).toBeVisible();

    unmount();
    renderInspector(makeSeedItems()[0]);
    expect(screen.queryByLabelText("Test notes")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Result URL")).not.toBeInTheDocument();
  });

  it("focuses the first missing planning field without starting Test Drive", async () => {
    const user = userEvent.setup();
    const idea: ParkingItem = {
      id: "idea-1",
      kind: "idea",
      status: "parked",
      title: "Compare onboarding flows",
      ideaText: "Prototype both flows.",
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-20T00:00:00.000Z",
      lastActivityAt: "2026-07-20T00:00:00.000Z",
    };
    const { onApplyAction } = renderInspector(idea);

    await user.click(screen.getByRole("button", { name: "Start Test Drive" }));

    expect(screen.getByLabelText("Effort tier")).toHaveFocus();
    expect(screen.getByText("Add an effort tier and first test task before starting a Test Drive.")).toBeVisible();
    expect(onApplyAction).not.toHaveBeenCalled();
  });

  it("submits valid Idea planning through the shared editor", async () => {
    const user = userEvent.setup();
    const idea: ParkingItem = {
      id: "idea-1",
      kind: "idea",
      status: "parked",
      title: "Compare onboarding flows",
      ideaText: "Prototype both flows.",
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-20T00:00:00.000Z",
      lastActivityAt: "2026-07-20T00:00:00.000Z",
    };
    const onUpdateIdea = vi.fn().mockReturnValue({ ok: true });
    render(
      <ItemInspector item={idea} open onOpenChange={vi.fn()} onApplyAction={vi.fn()} onUpdateEvidence={vi.fn()} onUpdateIdea={onUpdateIdea} />,
    );

    await user.selectOptions(screen.getByLabelText("Effort tier"), "focused_session");
    await user.type(screen.getByLabelText("First test task"), "Interview five users.");
    await user.click(screen.getByRole("button", { name: "Save planning" }));

    expect(onUpdateIdea).toHaveBeenCalledWith({
      title: idea.title,
      ideaText: idea.ideaText,
      effortTier: "focused_session",
      suggestedTestTask: "Interview five users.",
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
