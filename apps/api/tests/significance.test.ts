import { describe, it, expect } from "vitest";
import { assessSignificance } from "../src/modules/significance-engine/service.js";
import { calculateSignals } from "../src/modules/signal-engine/service.js";

describe("Significance Engine (Deterministic Attention Scoring)", () => {
  it("assigns HIGH attention to individual big move with high volume", () => {
    const signals = calculateSignals({
      currentPrice: 1423.5,
      baselinePrice: 1500.0, // -5.1%
      benchmarkReturnPct: -1.0,
      sectorReturnPct: -1.5,
      currentVolume: 12_000_000,
      expectedVolume: 5_000_000, // 2.4x
      week52High: 1950.0,
      week52Low: 1350.0,
      isFirstView: false,
    });

    const result = assessSignificance(signals, {
      isFirstView: false,
      marketWideContext: { benchmarkReturnPct: -1.0 },
    });

    expect(result.attention).toBe("HIGH");
    expect(result.attentionScore).toBeGreaterThanOrEqual(7.0);
  });

  it("downgrades to MEDIUM when drop is market-wide rather than stock-specific", () => {
    // Both stock and market are down ~5%
    const signals = calculateSignals({
      currentPrice: 95.0,
      baselinePrice: 100.0, // -5.0%
      benchmarkReturnPct: -4.8, // Market also collapsed -4.8%
      sectorReturnPct: -4.9,
      currentVolume: 5_000_000,
      expectedVolume: 5_000_000,
      week52High: null,
      week52Low: null,
      isFirstView: false,
    });

    const result = assessSignificance(signals, {
      isFirstView: false,
      marketWideContext: { benchmarkReturnPct: -4.8 },
    });

    // Stock relative move is only -0.2 pp, so it is NOT an idiosyncratic stock crash
    expect(result.attention).not.toBe("HIGH");
    expect(result.attention).toBe("MEDIUM");
  });

  it("assigns NONE attention to small routine movements", () => {
    const signals = calculateSignals({
      currentPrice: 100.2,
      baselinePrice: 100.0, // +0.2%
      benchmarkReturnPct: 0.1,
      sectorReturnPct: 0.2,
      currentVolume: 5_100_000,
      expectedVolume: 5_000_000,
      week52High: null,
      week52Low: null,
      isFirstView: false,
    });

    const result = assessSignificance(signals, {
      isFirstView: false,
    });

    expect(result.attention).toBe("NONE");
  });
});
