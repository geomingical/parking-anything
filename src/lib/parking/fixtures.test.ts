import { describe, expect, it } from "vitest";

import { ParkingItemSchema } from "./schemas";
import { makeSeedItems } from "./fixtures";

describe("makeSeedItems", () => {
  it("returns the exact three deterministic fixture identities", () => {
    expect(makeSeedItems().map(({ id }) => id)).toEqual([
      "seed-stale",
      "seed-driving",
      "seed-garaged",
    ]);
  });

  it("contains one stale parked, one evidenced test drive, and one evidenced Garage item", () => {
    const [stale, driving, garaged] = makeSeedItems();

    expect(stale).toMatchObject({ status: "parked" });
    expect(stale.lastActivityAt < "2026-07-01T00:00:00.000Z").toBe(true);
    expect(driving).toMatchObject({ status: "test_driving" });
    expect(driving.notes).toBeTruthy();
    expect(garaged).toMatchObject({ status: "garaged" });
    expect(Boolean(garaged.notes || garaged.repoUrl)).toBe(true);
  });

  it("returns schema-valid cloned objects on every call", () => {
    const first = makeSeedItems();
    const second = makeSeedItems();

    expect(() => first.forEach((item) => ParkingItemSchema.parse(item))).not.toThrow();
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first[0]).not.toBe(second[0]);

    first[0].title = "Changed locally";
    expect(second[0].title).toBe("OpenAI Platform Docs");
  });
});
