"use client";

import { useState, useSyncExternalStore } from "react";

import { makeSeedItems } from "@/lib/parking/fixtures";
import type { ParkingItem } from "@/lib/parking/schemas";
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
  addItem(item: ParkingItem): void;
  applyAction(
    id: string,
    action: ParkingAction,
  ): { ok: true } | { ok: false; message: string };
  updateEvidence(id: string, notes: string, repoUrl: string): void;
  resetDemo(): void;
};

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

function commitItems(items: ParkingItem[]) {
  const saved = saveParkingStore(items);
  publishSnapshot({
    items,
    storageWarning: saved.ok ? null : saved.error,
    needsReset: false,
    isHydrated: true,
  });
}

export function useParkingStore(): ParkingStoreController {
  const persistent = useSyncExternalStore(
    subscribe,
    buildBrowserSnapshot,
    getServerSnapshot,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function addItem(item: ParkingItem) {
    commitItems([...buildBrowserSnapshot().items, item]);
    setSelectedId(item.id);
  }

  function applyAction(
    id: string,
    action: ParkingAction,
  ): { ok: true } | { ok: false; message: string } {
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
    const currentItems = buildBrowserSnapshot().items;
    const index = currentItems.findIndex((item) => item.id === id);
    if (index === -1) return;

    const now = new Date().toISOString();
    const items = [...currentItems];
    items[index] = {
      ...items[index],
      notes: notes || undefined,
      repoUrl: repoUrl || undefined,
      updatedAt: now,
      lastActivityAt: now,
    };
    commitItems(items);
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
    resetDemo,
  };
}
