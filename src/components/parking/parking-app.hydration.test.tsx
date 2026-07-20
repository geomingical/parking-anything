import { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEY } from "@/lib/parking/storage";
import { V1_STORAGE_KEY } from "@/lib/parking/storage-v1";
import { ParkingApp } from "./parking-app";

const customItem = {
  id: "custom-hydration-item",
  url: "https://example.com/custom-tool",
  category: "ai_tool" as const,
  status: "parked",
  title: "Hydration Custom Tool",
  summary: "A custom item that must survive server rendering and hydration.",
  effortTier: "quick_spin",
  suggestedTestTask: "Confirm that this exact item remains in browser storage.",
  usefulnessHypothesis: "Useful if hydration never replaces existing local data.",
  createdAt: "2026-07-20T02:00:00.000Z",
  updatedAt: "2026-07-20T02:00:00.000Z",
  lastActivityAt: "2026-07-20T02:00:00.000Z",
};

const { category: _legacyCategory, ...customItemFields } = customItem;
void _legacyCategory;
const migratedCustomItem = { ...customItemFields, kind: "ai_tool" as const };

function storedItems() {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).parkingItems;
}

function serverMarkupWithoutBrowserStorage(storage: Storage): string {
  vi.stubGlobal("localStorage", undefined);
  const html = renderToString(<ParkingApp />);
  vi.stubGlobal("localStorage", storage);
  return html;
}

async function hydrateApp(
  container: HTMLElement,
  recoverableErrors: unknown[],
): Promise<Root> {
  let root!: Root;
  await act(async () => {
    root = hydrateRoot(container, <ParkingApp />, {
      onRecoverableError: (error) => recoverableErrors.push(error),
    });
    await Promise.resolve();
  });
  return root;
}

describe("ParkingApp hydration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("hydrates exact existing browser data, persists the first action, and retains it after reload", async () => {
    const user = userEvent.setup();
    const storage = window.localStorage;
    const v1Bytes = JSON.stringify({ version: 1, items: [customItem] });
    storage.setItem(V1_STORAGE_KEY, v1Bytes);
    const recoverableErrors: unknown[] = [];
    const container = document.createElement("div");
    document.body.append(container);

    container.innerHTML = serverMarkupWithoutBrowserStorage(storage);
    let root = await hydrateApp(container, recoverableErrors);

    expect(
      await within(container).findByRole("button", {
        name: "Hydration Custom Tool, Parked",
      }),
    ).toBeVisible();
    expect(
      within(container).queryByText(/Browser storage is unavailable/i),
    ).not.toBeInTheDocument();
    expect(storedItems()).toEqual([migratedCustomItem]);
    expect(storage.getItem(V1_STORAGE_KEY)).toBe(v1Bytes);

    await user.click(
      within(container).getByRole("button", {
        name: "Hydration Custom Tool, Parked",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Start Test Drive" }));

    expect(storedItems()).toEqual([
      expect.objectContaining({
        id: customItem.id,
        status: "test_driving",
      }),
    ]);
    expect(storedItems().map(({ id }) => id)).toEqual([customItem.id]);

    await act(async () => root.unmount());
    container.innerHTML = serverMarkupWithoutBrowserStorage(storage);
    root = await hydrateApp(container, recoverableErrors);

    await user.click(within(container).getByRole("tab", { name: "Test Driving 1" }));
    expect(
      within(container).getByRole("button", {
        name: "Hydration Custom Tool, Test Driving",
      }),
    ).toBeVisible();
    expect(
      within(container).queryByText(/Browser storage is unavailable/i),
    ).not.toBeInTheDocument();

    expect(recoverableErrors).toEqual([]);

    await act(async () => root.unmount());
    container.remove();
  });
});
