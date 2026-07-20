"use client";

import { useState, useSyncExternalStore } from "react";
import { ZodError } from "zod";

import { makeSeedItems } from "@/lib/parking/fixtures";
import {
  ParkingStoreV2Schema,
  type EffortTier,
  type ParkingItem,
} from "@/lib/parking/schemas";
import {
  STORAGE_KEY,
  loadParkingStore,
  saveParkingStore,
} from "@/lib/parking/storage";
import {
  transitionItem,
  type ParkingAction,
} from "@/lib/parking/transitions";

export type ParkingStoreController = {
  items: ParkingItem[];
  selectedId: string | null;
  storageWarning: string | null;
  needsReset: boolean;
  isHydrated: boolean;
  selectItem(id: string | null): void;
  addItem(item: ParkingItem): ActionResult;
  applyAction(
    id: string,
    action: ParkingAction,
  ): ActionResult;
  updateEvidence(id: string, notes: string, resultUrl: string): ActionResult;
  updateIdea(
    id: string,
    input: {
      title: string;
      ideaText: string;
      effortTier?: EffortTier;
      suggestedTestTask?: string;
    },
  ): ActionResult;
  resetDemo(): void;
};

export type ActionResult =
  | { ok: true }
  | { ok: false; message: string };

type PersistentSnapshot = Pick<
  ParkingStoreController,
  "items" | "storageWarning" | "needsReset" | "isHydrated"
>;

const SERVER_SNAPSHOT: PersistentSnapshot = {
  items: [],
  storageWarning: null,
  needsReset: false,
  isHydrated: false,
};

const STORAGE_UNAVAILABLE = Symbol("storage-unavailable");
const SNAPSHOT_UNREAD = Symbol("snapshot-unread");
type StorageFingerprint = string | null | typeof STORAGE_UNAVAILABLE;

let cachedFingerprint: StorageFingerprint | typeof SNAPSHOT_UNREAD = SNAPSHOT_UNREAD;
let cachedSnapshot: PersistentSnapshot | null = null;
const listeners = new Set<() => void>();

function readStorageFingerprint(): StorageFingerprint {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return STORAGE_UNAVAILABLE;
  }
}

function buildBrowserSnapshot(): PersistentSnapshot {
  const fingerprint = readStorageFingerprint();
  if (cachedSnapshot && fingerprint === cachedFingerprint) {
    return cachedSnapshot;
  }

  if (fingerprint === STORAGE_UNAVAILABLE) {
    cachedFingerprint = fingerprint;
    cachedSnapshot = {
      items: makeSeedItems(),
      storageWarning:
        "Browser storage is unavailable; changes will last for this session only.",
      needsReset: false,
      isHydrated: true,
    };
    return cachedSnapshot;
  }

  const loaded = loadParkingStore();
  cachedFingerprint = readStorageFingerprint();
  cachedSnapshot =
    loaded.kind === "needs_reset"
      ? {
          items: [],
          storageWarning: null,
          needsReset: true,
          isHydrated: true,
        }
      : {
          items: loaded.items,
          storageWarning: null,
          needsReset: false,
          isHydrated: true,
        };
  return cachedSnapshot;
}

function getServerSnapshot(): PersistentSnapshot {
  return SERVER_SNAPSHOT;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publishSnapshot(snapshot: PersistentSnapshot) {
  cachedSnapshot = snapshot;
  cachedFingerprint = readStorageFingerprint();
  listeners.forEach((listener) => listener());
}

function commitItems(items: ParkingItem[]): ActionResult {
  let validItems: ParkingItem[];
  try {
    validItems = ParkingStoreV2Schema.parse({
      version: 2,
      parkingItems: items,
    }).parkingItems;
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ZodError
          ? (error.issues[0]?.message ?? "This parking item could not be saved.")
          : "This parking item could not be saved.",
    };
  }

  const saved = saveParkingStore(validItems);
  publishSnapshot({
    items: validItems,
    storageWarning: saved.ok ? null : saved.error,
    needsReset: false,
    isHydrated: true,
  });
  return { ok: true };
}

export function useParkingStore(): ParkingStoreController {
  const persistent = useSyncExternalStore(
    subscribe,
    buildBrowserSnapshot,
    getServerSnapshot,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function addItem(item: ParkingItem) {
    return commitItems([...buildBrowserSnapshot().items, item]);
  }

  function applyAction(
    id: string,
    action: ParkingAction,
  ): ActionResult {
    const currentItems = buildBrowserSnapshot().items;
    const index = currentItems.findIndex((item) => item.id === id);
    if (index === -1) {
      return { ok: false, message: "This parking item could not be found." };
    }

    try {
      const nextItem = transitionItem(
        currentItems[index],
        action,
        new Date().toISOString(),
      );
      const items = [...currentItems];
      items[index] = nextItem;
      return commitItems(items);
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "The item could not be moved.",
      };
    }
  }

  function updateEvidence(
    id: string,
    notes: string,
    resultUrl: string,
  ): ActionResult {
    const currentItems = buildBrowserSnapshot().items;
    const index = currentItems.findIndex((item) => item.id === id);
    if (index === -1) {
      return { ok: false, message: "This parking item could not be found." };
    }

    if (
      currentItems[index].status === "garaged" ||
      currentItems[index].status === "scrapped"
    ) {
      return {
        ok: false,
        message: "This item has reached a final decision and cannot be edited.",
      };
    }

    const now = new Date().toISOString();
    const items = [...currentItems];
    items[index] = {
      ...items[index],
      notes: notes || undefined,
      resultUrl: resultUrl || undefined,
      updatedAt: now,
      lastActivityAt: now,
    };
    return commitItems(items);
  }

  function updateIdea(
    id: string,
    input: {
      title: string;
      ideaText: string;
      effortTier?: EffortTier;
      suggestedTestTask?: string;
    },
  ): ActionResult {
    const currentItems = buildBrowserSnapshot().items;
    const index = currentItems.findIndex((item) => item.id === id);
    if (index === -1) {
      return { ok: false, message: "This parking item could not be found." };
    }

    const item = currentItems[index];
    if (item.kind !== "idea") {
      return { ok: false, message: "Only Ideas can use the Idea editor." };
    }

    if (item.status === "garaged" || item.status === "scrapped") {
      return {
        ok: false,
        message: "This item has reached a final decision and cannot be edited.",
      };
    }

    const now = new Date().toISOString();
    const items = [...currentItems];
    items[index] = {
      ...item,
      title: input.title,
      ideaText: input.ideaText,
      effortTier: input.effortTier,
      suggestedTestTask: input.suggestedTestTask,
      updatedAt: now,
      lastActivityAt: now,
    };
    return commitItems(items);
  }

  function resetDemo() {
    commitItems(makeSeedItems());
    setSelectedId(null);
  }

  return {
    ...persistent,
    selectedId,
    selectItem: setSelectedId,
    addItem,
    applyAction,
    updateEvidence,
    updateIdea,
    resetDemo,
  };
}
