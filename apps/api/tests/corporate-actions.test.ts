import { describe, it, expect } from "vitest";
import { calculateSignals } from "../src/modules/signal-engine/service.js";

describe("Corporate Actions Adjustment (False Alert Prevention)", () => {
  it("prevents false -50% alarm on a 2:1 stock split by applying adjustment factor 0.5", () => {
    // Before split: baseline was 3800
    // After split: current price is 1900
    // Without adjustment: (1900 - 3800) / 3800 = -50% (CRASH ALARM!)
    // With adjustment factor 0.5: adjusted baseline = 3800 * 0.5 = 1900 -> 0% change (NORMAL!)

    const unadjustedSignals = calculateSignals({
      currentPrice: 1900.0,
      baselinePrice: 3800.0,
      previousClose: 1900.0,
      benchmarkReturnPct: 0.0,
      sectorReturnPct: 0.0,
      currentVolume: 2_000_000,
      expectedVolume: 2_000_000,
      week52High: 2200.0,
      week52Low: 1500.0,
      corporateActionAdjustmentFactor: null,
    });

    const unadjustedPriceChange = unadjustedSignals.find((s) => s.type === "PRICE_CHANGE");
    expect(unadjustedPriceChange?.value).toBeCloseTo(-50.0, 1);

    const adjustedSignals = calculateSignals({
      currentPrice: 1900.0,
      baselinePrice: 3800.0,
      previousClose: 1900.0,
      benchmarkReturnPct: 0.0,
      sectorReturnPct: 0.0,
      currentVolume: 2_000_000,
      expectedVolume: 2_000_000,
      week52High: 2200.0,
      week52Low: 1500.0,
      corporateActionAdjustmentFactor: 0.5, // 2:1 split factor
    });

    const adjustedPriceChange = adjustedSignals.find((s) => s.type === "PRICE_CHANGE");
    expect(adjustedPriceChange?.value).toBeCloseTo(0.0, 1);
  });
});
