import type { ParkingItem } from "./schemas";

export type ParkingAction =
  | { type: "start_test_drive" }
  | { type: "return_to_lot" }
  | { type: "park_in_garage"; notes: string; repoUrl: string }
  | { type: "tow_away"; finalDecisionReason: string };

const TERMINAL_MESSAGE = "This item has reached a final decision and cannot be moved.";
const INVALID_ACTION_MESSAGE = "This action is not available for the item's current status.";
const GARAGE_EVIDENCE_MESSAGE =
  "Add a note or result link before parking in the Garage.";
const TOW_REASON_MESSAGE =
  "Record why this tool is leaving before towing it away.";

function withActivity(
  nowIso: string,
): Pick<ParkingItem, "updatedAt" | "lastActivityAt"> {
  return {
    updatedAt: nowIso,
    lastActivityAt: nowIso,
  };
}

export function transitionItem(
  item: ParkingItem,
  action: ParkingAction,
  nowIso: string,
): ParkingItem {
  if (item.status === "garaged" || item.status === "scrapped") {
    throw new Error(TERMINAL_MESSAGE);
  }

  if (item.status === "parked" && action.type === "start_test_drive") {
    return {
      ...item,
      status: "test_driving",
      testStartedAt: nowIso,
      ...withActivity(nowIso),
    };
  }

  if (item.status === "test_driving" && action.type === "return_to_lot") {
    return {
      ...item,
      status: "parked",
      ...withActivity(nowIso),
    };
  }

  if (item.status === "test_driving" && action.type === "park_in_garage") {
    const notes = action.notes.trim() || item.notes?.trim();
    const repoUrl = action.repoUrl.trim() || item.repoUrl?.trim();

    if (!notes && !repoUrl) {
      throw new Error(GARAGE_EVIDENCE_MESSAGE);
    }

    return {
      ...item,
      status: "garaged",
      ...(notes ? { notes } : {}),
      ...(repoUrl ? { repoUrl } : {}),
      ...withActivity(nowIso),
    };
  }

  if (
    (item.status === "parked" || item.status === "test_driving") &&
    action.type === "tow_away"
  ) {
    const finalDecisionReason = action.finalDecisionReason.trim();

    if (!finalDecisionReason) {
      throw new Error(TOW_REASON_MESSAGE);
    }

    return {
      ...item,
      status: "scrapped",
      finalDecisionReason,
      ...withActivity(nowIso),
    };
  }

  throw new Error(INVALID_ACTION_MESSAGE);
}
