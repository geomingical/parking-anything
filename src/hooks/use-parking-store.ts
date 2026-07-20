"use client";

import { useRef, useState } from "react";

import { makeSeedItems } from "@/lib/parking/fixtures";
import type { ParkingItem } from "@/lib/parking/schemas";
import { loadParkingStore, saveParkingStore } from "@/lib/parking/storage";
import {
  transitionItem,
  type ParkingAction,
} from "@/lib/parking/transitions";

export type ParkingStoreController = {
  items: ParkingItem[];
  selectedId: string | null;
  storageWarning: string | null;
  needsReset: boolean;
  selectItem(id: string | null): void;
  addItem(item: ParkingItem): void;
  applyAction(
    id: string,
    action: ParkingAction,
  ): { ok: true } | { ok: false; message: string };
  updateEvidence(id: string, notes: string, repoUrl: string): void;
  resetDemo(): void;
};

type StoreState = Pick<
  ParkingStoreController,
  "items" | "selectedId" | "storageWarning" | "needsReset"
>;

function initialState(): StoreState {
  try {
    const loaded = loadParkingStore();
    if (loaded.kind === "needs_reset") {
      return {
        items: [],
        selectedId: null,
        storageWarning: null,
        needsReset: true,
      };
    }

    return {
      items: loaded.items,
      selectedId: null,
      storageWarning: null,
      needsReset: false,
    };
  } catch {
    return {
      items: makeSeedItems(),
      selectedId: null,
      storageWarning: "Browser storage is unavailable; changes will last for this session only.",
      needsReset: false,
    };
  }
}

export function useParkingStore(): ParkingStoreController {
  const [state, setState] = useState<StoreState>(initialState);
  const stateRef = useRef(state);

  function replaceState(next: StoreState) {
    stateRef.current = next;
    setState(next);
  }

  function commitItems(items: ParkingItem[], selectedId = stateRef.current.selectedId) {
    const saved = saveParkingStore(items);
    replaceState({
      ...stateRef.current,
      items,
      selectedId,
      needsReset: false,
      storageWarning: saved.ok ? null : saved.error,
    });
  }

  function selectItem(selectedId: string | null) {
    replaceState({ ...stateRef.current, selectedId });
  }

  function addItem(item: ParkingItem) {
    commitItems([...stateRef.current.items, item], item.id);
  }

  function applyAction(
    id: string,
    action: ParkingAction,
  ): { ok: true } | { ok: false; message: string } {
    const index = stateRef.current.items.findIndex((item) => item.id === id);
    if (index === -1) {
      return { ok: false, message: "This parking item could not be found." };
    }

    try {
      const nextItem = transitionItem(
        stateRef.current.items[index],
        action,
        new Date().toISOString(),
      );
      const items = [...stateRef.current.items];
      items[index] = nextItem;
      commitItems(items);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "The item could not be moved.",
      };
    }
  }

  function updateEvidence(id: string, notes: string, repoUrl: string) {
    const index = stateRef.current.items.findIndex((item) => item.id === id);
    if (index === -1) return;

    const now = new Date().toISOString();
    const item = stateRef.current.items[index];
    const items = [...stateRef.current.items];
    items[index] = {
      ...item,
      notes: notes || undefined,
      repoUrl: repoUrl || undefined,
      updatedAt: now,
      lastActivityAt: now,
    };
    commitItems(items);
  }

  function resetDemo() {
    commitItems(makeSeedItems(), null);
  }

  return {
    ...state,
    selectItem,
    addItem,
    applyAction,
    updateEvidence,
    resetDemo,
  };
}
