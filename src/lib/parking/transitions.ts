import { ParkingItemSchema, type ParkingItem } from "./schemas";

export type ParkingAction =
  | { type: "start_test_drive" }
  | { type: "return_to_lot" }
  | { type: "park_in_garage"; notes: string; resultUrl: string }
  | { type: "tow_away"; finalDecisionReason: string };

const TERMINAL_MESSAGE = "This item has reached a final decision and cannot be moved.";
const INVALID_ACTION_MESSAGE = "This action is not available for the item's current status.";
const GARAGE_EVIDENCE_MESSAGE =
  "Add a note or result link before parking in the Garage.";
const TOW_REASON_MESSAGE =
  "Record why this tool is leaving before towing it away.";
const IDEA_PLANNING_MESSAGE =
  "Add an effort tier and first test task before starting a Test Drive.";

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
    if (
      item.kind === "idea" &&
      (!item.effortTier || !item.suggestedTestTask?.trim())
    ) {
      throw new Error(IDEA_PLANNING_MESSAGE);
    }

    return ParkingItemSchema.parse({
      ...item,
      status: "test_driving",
      testStartedAt: nowIso,
      ...withActivity(nowIso),
    });
  }

  if (item.status === "test_driving" && action.type === "return_to_lot") {
    return ParkingItemSchema.parse({
      ...item,
      status: "parked",
      ...withActivity(nowIso),
    });
  }

  if (item.status === "test_driving" && action.type === "park_in_garage") {
    const notes = action.notes.trim() || item.notes?.trim();
    const resultUrl = action.resultUrl.trim() || item.resultUrl?.trim();

    if (!notes && !resultUrl) {
      throw new Error(GARAGE_EVIDENCE_MESSAGE);
    }

    return ParkingItemSchema.parse({
      ...item,
      status: "garaged",
      ...(notes ? { notes } : {}),
      ...(resultUrl ? { resultUrl } : {}),
      ...withActivity(nowIso),
    });
  }

  if (
    (item.status === "parked" || item.status === "test_driving") &&
    action.type === "tow_away"
  ) {
    const finalDecisionReason = action.finalDecisionReason.trim();

    if (!finalDecisionReason) {
      throw new Error(TOW_REASON_MESSAGE);
    }

    return ParkingItemSchema.parse({
      ...item,
      status: "scrapped",
      finalDecisionReason,
      ...withActivity(nowIso),
    });
  }

  throw new Error(INVALID_ACTION_MESSAGE);
}
