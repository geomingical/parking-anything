import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { IdeaCaptureForm } from "./idea-capture-form";

describe("IdeaCaptureForm", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", {
      ...globalThis.crypto,
      randomUUID: vi.fn(() => "idea-client-id"),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("creates one parked Idea without a network call", async () => {
    const user = userEvent.setup();
    const onPark = vi.fn(() => ({ ok: true as const }));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<IdeaCaptureForm onPark={onPark} />);

    await user.type(screen.getByLabelText("Idea title"), "Compare onboarding flows");
    await user.type(
      screen.getByLabelText("Idea"),
      "Prototype both flows with five users.",
    );
    await user.click(screen.getByRole("button", { name: "Park Idea" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(onPark).toHaveBeenCalledTimes(1);
    expect(onPark).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "idea-client-id",
        kind: "idea",
        status: "parked",
        title: "Compare onboarding flows",
        ideaText: "Prototype both flows with five users.",
      }),
    );
    const item = onPark.mock.calls[0][0];
    expect(item.createdAt).toBe(item.updatedAt);
    expect(item.lastActivityAt).toBe(item.createdAt);
  });

  it("preserves invalid input and shows field-level errors", async () => {
    const user = userEvent.setup();
    const onPark = vi.fn(() => ({ ok: true as const }));
    render(<IdeaCaptureForm onPark={onPark} />);

    await user.type(screen.getByLabelText("Idea title"), "Keep this title");
    await user.click(screen.getByRole("button", { name: "Park Idea" }));

    expect(screen.getByLabelText("Idea title")).toHaveValue("Keep this title");
    expect(screen.getByText("Describe the idea before parking it.")).toBeVisible();
    expect(onPark).not.toHaveBeenCalled();
  });

  it("enforces exact title and Idea text limits without clearing input", async () => {
    const onPark = vi.fn(() => ({ ok: true as const }));
    render(<IdeaCaptureForm onPark={onPark} />);
    const title = screen.getByLabelText("Idea title");
    const idea = screen.getByLabelText("Idea");

    expect(title).toHaveAttribute("maxlength", "120");
    expect(idea).toHaveAttribute("maxlength", "2000");
    fireEvent.change(title, { target: { value: "t".repeat(121) } });
    fireEvent.change(idea, { target: { value: "i".repeat(2001) } });
    fireEvent.submit(screen.getByRole("button", { name: "Park Idea" }).closest("form")!);

    expect(onPark).not.toHaveBeenCalled();
    expect(title).toHaveValue("t".repeat(121));
    expect(idea).toHaveValue("i".repeat(2001));
    expect(screen.getByText("Use 120 characters or fewer.")).toBeVisible();
    expect(screen.getByText("Use 2,000 characters or fewer.")).toBeVisible();
  });
});
