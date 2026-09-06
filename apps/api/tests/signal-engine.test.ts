import { describe, it, expect } from "vitest";
import { calculateSignals } from "../src/modules/signal-engine/service.js";

describe("Signal Engine (Pure Calculations)", () => {
  it("should calculate price change correctly since baseline", () => {
    const signals = calculateSignals({
      currentPrice: 1425.0,
      baselinePrice: 1500.0,
      benchmarkReturnPct: -1.0,
      sectorReturnPct: -2.0,
      currentVolume: 10_000_000,
      expectedVolume: 5_000_000,
      week52High: 1950.0,
      week52Low: 1350.0,
      isFirstView: false,
    });

    const priceSignal = signals.find((s) => s.type === "PRICE_CHANGE");
    expect(priceSignal).toBeDefined();
    expect(priceSignal?.status).toBe("VALID");
    expect(priceSignal?.value).toBeCloseTo(-5.0, 2);
  });

  it("should calculate market relative movement correctly", () => {
    // Stock down -5%, benchmark down -1% -> relative underperformance of -4.0 pp
    const signals = calculateSignals({
      currentPrice: 95.0,
      baselinePrice: 100.0,
      benchmarkReturnPct: -1.0,
      sectorReturnPct: null,
      currentVolume: null,
      expectedVolume: null,
      week52High: null,
      week52Low: null,
      isFirstView: false,
    });

    const marketRelative = signals.find((s) => s.type === "MARKET_RELATIVE");
    expect(marketRelative).toBeDefined();
    expect(marketRelative?.status).toBe("VALID");
    expect(marketRelative?.value).toBeCloseTo(-4.0, 2);
  });

  it("should calculate volume anomaly correctly", () => {
    const signals = calculateSignals({
      currentPrice: 100.0,
      baselinePrice: 100.0,
      benchmarkReturnPct: null,
      sectorReturnPct: null,
      currentVolume: 12_000_000,
      expectedVolume: 5_000_000,
      week52High: null,
      week52Low: null,
      isFirstView: false,
    });

    const volSignal = signals.find((s) => s.type === "VOLUME_ANOMALY");
    expect(volSignal).toBeDefined();
    expect(volSignal?.status).toBe("VALID");
    expect(volSignal?.value).toBeCloseTo(2.4, 1);
  });

  it("should return NOT_AVAILABLE for price change on first view", () => {
    const signals = calculateSignals({
      currentPrice: 100.0,
      baselinePrice: null,
      benchmarkReturnPct: -1.0,
      sectorReturnPct: null,
      currentVolume: 5_000_000,
      expectedVolume: 5_000_000,
      week52High: null,
      week52Low: null,
      isFirstView: true,
    });

    const priceSignal = signals.find((s) => s.type === "PRICE_CHANGE");
    expect(priceSignal?.status).toBe("NOT_AVAILABLE");
  });
});
