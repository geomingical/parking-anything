import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CaptureSwitcher } from "./capture-switcher";

describe("CaptureSwitcher", () => {
  it("renders one tab per link kind plus the Idea tab", () => {
    render(<CaptureSwitcher activeMode="ai_tool" onChange={vi.fn()} />);

    expect(screen.getByRole("tab", { name: "Park tool" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Park read" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Park idea" })).toBeVisible();
  });

  it("reports the registry id of the chosen mode", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CaptureSwitcher activeMode="ai_tool" onChange={onChange} />);

    await user.click(screen.getByRole("tab", { name: "Park read" }));

    expect(onChange).toHaveBeenCalledWith("read");
  });

  it("wraps arrow-key navigation across all three tabs", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <CaptureSwitcher activeMode="ai_tool" onChange={onChange} />,
    );

    const toolTab = screen.getByRole("tab", { name: "Park tool" });
    toolTab.focus();
    await user.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith("idea");

    rerender(<CaptureSwitcher activeMode="idea" onChange={onChange} />);
    const ideaTab = screen.getByRole("tab", { name: "Park idea" });
    ideaTab.focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith("ai_tool");
  });
});
