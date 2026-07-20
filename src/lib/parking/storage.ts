import { z } from "zod";

import { makeSeedItems } from "./fixtures";
import { ParkingItemSchema, type ParkingItem } from "./schemas";

export const STORAGE_KEY = "parking-anything:v1";

const StorageEnvelopeSchema = z
  .object({
    version: z.literal(1),
    items: z.array(ParkingItemSchema),
  })
  .strict();

export type LoadParkingStoreResult =
  | { kind: "ok"; items: ParkingItem[] }
  | { kind: "initialized"; items: ParkingItem[] }
  | { kind: "needs_reset"; reason: "malformed" | "wrong_version" };

export type SaveParkingStoreResult =
  | { ok: true }
  | { ok: false; error: string };

export function saveParkingStore(items: ParkingItem[]): SaveParkingStoreResult {
  try {
    const envelope = StorageEnvelopeSchema.parse({ version: 1, items });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Unable to save parking data in this browser.",
    };
  }
}

export function loadParkingStore(): LoadParkingStoreResult {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (raw === null) {
    const items = makeSeedItems();
    saveParkingStore(items);
    return { kind: "initialized", items };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: "needs_reset", reason: "malformed" };
  }

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "version" in parsed &&
    parsed.version !== 1
  ) {
    return { kind: "needs_reset", reason: "wrong_version" };
  }

  const envelope = StorageEnvelopeSchema.safeParse(parsed);
  if (!envelope.success) {
    return { kind: "needs_reset", reason: "malformed" };
  }

  return { kind: "ok", items: envelope.data.items };
}

export function resetParkingStore(): ParkingItem[] {
  const items = makeSeedItems();
  saveParkingStore(items);
  return items;
}
