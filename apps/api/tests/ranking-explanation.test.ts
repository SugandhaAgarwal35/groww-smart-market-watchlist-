import { describe, it, expect } from "vitest";
import { rankSnapshotItems } from "../src/modules/ranking/service.js";
import { buildExplanation } from "../src/modules/explanation/service.js";
import type { SnapshotItem, Signal } from "@watchlist/contracts";

describe("Ranking Service", () => {
  it("should rank HIGH attention before MEDIUM, and higher score first", () => {
    const itemA: SnapshotItem = {
      security: { id: "1", symbol: "INFY", name: "Infosys", exchange: "NSE" },
      market: { price: 1400, previousClose: 1500, dayChange: -100, dayChangePct: -6.67, volume: 10000000, week52High: 1900, week52Low: 1300, observedAt: "2026-09-04T12:00:00Z", freshness: "FRESH", observationId: "obs-1" },
      change: { state: "CHANGED", attention: "MEDIUM", attentionScore: 4.5, confidence: "HIGH", confidenceScore: 0.9 },
      signals: [],
      explanation: [],
      seen: { baselineObservedAt: null, baselinePrice: 1500, baselineVersion: 1, sinceLastCheck: "-6.67%" },
    };

    const itemB: SnapshotItem = {
      security: { id: "2", symbol: "TCS", name: "TCS", exchange: "NSE" },
      market: { price: 3500, previousClose: 3600, dayChange: -100, dayChangePct: -2.78, volume: 2000000, week52High: 4200, week52Low: 3000, observedAt: "2026-09-04T12:00:00Z", freshness: "FRESH", observationId: "obs-2" },
      change: { state: "CHANGED", attention: "HIGH", attentionScore: 7.0, confidence: "HIGH", confidenceScore: 1.0 },
      signals: [],
      explanation: [],
      seen: { baselineObservedAt: null, baselinePrice: 3600, baselineVersion: 1, sinceLastCheck: "-2.78%" },
    };

    const ranked = rankSnapshotItems([itemA, itemB]);
    expect(ranked[0]!.security.symbol).toBe("TCS"); // High attention first
    expect(ranked[1]!.security.symbol).toBe("INFY");
  });
});

describe("Explanation Service", () => {
  it("should produce clear explanation for first view", () => {
    const facts = buildExplanation([], {
      isFirstView: true,
      marketSession: "OPEN",
      freshness: "FRESH",
      confidenceLevel: "HIGH",
      confidenceReasons: [],
    });

    expect(facts).toContain("This is your first time viewing this security.");
    expect(facts).toContain("Changes will be tracked from this point forward.");
  });

  it("should produce structured factual statements from validated signals", () => {
    const signals: Signal[] = [
      { type: "PRICE_CHANGE", value: -5.1, unit: "PERCENT", status: "VALID", contribution: "-5.1%" },
      { type: "MARKET_RELATIVE", value: -4.1, unit: "PERCENTAGE_POINTS", status: "VALID", contribution: "-4.1 pp" },
      { type: "VOLUME_ANOMALY", value: 2.4, unit: "RATIO", status: "VALID", contribution: "2.4x" },
    ];

    const facts = buildExplanation(signals, {
      isFirstView: false,
      marketSession: "OPEN",
      freshness: "FRESH",
      confidenceLevel: "HIGH",
      confidenceReasons: [],
    });

    expect(facts).toContain("Down 5.1% since your last check");
    expect(facts).toContain("Underperforming the benchmark by 4.1 pp");
    expect(facts).toContain("Volume is 2.4× its recent baseline");
  });
});
