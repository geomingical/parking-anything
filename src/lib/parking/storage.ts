import { makeSeedItems } from "./fixtures";
import {
  ParkingStoreV2Schema,
  type ParkingItem,
} from "./schemas";
import {
  V1_STORAGE_KEY,
  convertV1Envelope,
} from "./storage-v1";

export const STORAGE_KEY = "parking-anything:v2";

export type LoadParkingStoreResult =
  | { kind: "ok"; items: ParkingItem[] }
  | { kind: "migrated"; items: ParkingItem[] }
  | { kind: "initialized"; items: ParkingItem[] }
  | { kind: "needs_reset"; reason: "malformed" | "wrong_version" };

export type SaveParkingStoreResult =
  | { ok: true }
  | { ok: false; error: string };

function resetReason(parsed: unknown, expectedVersion: number) {
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "version" in parsed &&
    parsed.version !== expectedVersion
  ) {
    return "wrong_version" as const;
  }

  return "malformed" as const;
}

function parseJson(raw: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

export function saveParkingStore(items: ParkingItem[]): SaveParkingStoreResult {
  try {
    const envelope = ParkingStoreV2Schema.parse({
      version: 2,
      parkingItems: items,
    });
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
  const rawV2 = localStorage.getItem(STORAGE_KEY);

  if (rawV2 !== null) {
    const parsedV2 = parseJson(rawV2);
    if (!parsedV2.ok) {
      return { kind: "needs_reset", reason: "malformed" };
    }

    const envelope = ParkingStoreV2Schema.safeParse(parsedV2.value);
    if (!envelope.success) {
      return {
        kind: "needs_reset",
        reason: resetReason(parsedV2.value, 2),
      };
    }

    return { kind: "ok", items: envelope.data.parkingItems };
  }

  const rawV1 = localStorage.getItem(V1_STORAGE_KEY);
  if (rawV1 !== null) {
    const parsedV1 = parseJson(rawV1);
    if (!parsedV1.ok) {
      return { kind: "needs_reset", reason: "malformed" };
    }

    try {
      const migrated = convertV1Envelope(parsedV1.value);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return { kind: "migrated", items: migrated.parkingItems };
    } catch {
      return {
        kind: "needs_reset",
        reason: resetReason(parsedV1.value, 1),
      };
    }
  }

  const items = makeSeedItems();
  saveParkingStore(items);
  return { kind: "initialized", items };
}

export function resetParkingStore(): ParkingItem[] {
  const items = makeSeedItems();
  saveParkingStore(items);
  return items;
}
