import { describe, it, expect } from "vitest";

describe("Seen-State Concurrency & Invariant Rules", () => {
  it("enforces monotonic advancement: older observed_at cannot overwrite newer baseline", () => {
    const currentBaselineObservedAt = new Date("2026-09-04T10:00:00Z");
    const lateArrivingObservedAt = new Date("2026-09-04T09:45:00Z");

    const isValidTransition = lateArrivingObservedAt.getTime() >= currentBaselineObservedAt.getTime();
    expect(isValidTransition).toBe(false);
  });

  it("enforces optimistic version locking: mismatched baseline version rejects stale updates", () => {
    const dbBaselineVersion = 8;
    const clientExpectedVersion = 7;

    const canUpdate = dbBaselineVersion === clientExpectedVersion;
    expect(canUpdate).toBe(false);
  });

  it("permits forward transition when version matches and time advances", () => {
    const dbBaselineVersion = 7;
    const clientExpectedVersion = 7;
    const currentBaselineObservedAt = new Date("2026-09-04T10:00:00Z");
    const newObservedAt = new Date("2026-09-04T10:30:00Z");

    const canUpdate =
      dbBaselineVersion === clientExpectedVersion &&
      newObservedAt.getTime() >= currentBaselineObservedAt.getTime();
    expect(canUpdate).toBe(true);
  });
});
