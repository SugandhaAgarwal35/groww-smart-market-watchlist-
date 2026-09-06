import { describe, it, expect } from "vitest";
import { assessConfidence } from "../src/modules/confidence-engine/service.js";

describe("Confidence Engine (Trustworthiness Assessment)", () => {
  it("determines HIGH confidence when all data sources and context are valid", () => {
    const result = assessConfidence({
      qualityStatus: "TRUSTED",
      freshness: "FRESH",
      hasValidBaseline: true,
      hasProviderConflict: false,
      hasCorporateActionCoverage: true,
      hasBenchmarkContext: true,
      hasSectorContext: true,
      hasVolumeHistory: true,
    });

    expect(result.confidence).toBe("HIGH");
    expect(result.confidenceScore).toBe(1.0);
    expect(result.reasons).toContain("All data sources validated");
  });

  it("downgrades to LOW confidence when there is a provider data conflict", () => {
    const result = assessConfidence({
      qualityStatus: "CONFLICTED",
      freshness: "FRESH",
      hasValidBaseline: true,
      hasProviderConflict: true,
      hasCorporateActionCoverage: true,
      hasBenchmarkContext: true,
      hasSectorContext: true,
      hasVolumeHistory: true,
    });

    expect(result.confidence).toBe("LOW");
    expect(result.reasons).toContain("Data conflict between sources");
  });

  it("downgrades to LOW confidence when observation is stale", () => {
    const result = assessConfidence({
      qualityStatus: "TRUSTED",
      freshness: "STALE",
      hasValidBaseline: true,
      hasProviderConflict: false,
      hasCorporateActionCoverage: true,
      hasBenchmarkContext: true,
      hasSectorContext: true,
      hasVolumeHistory: true,
    });

    expect(result.confidence).toBe("LOW");
    expect(result.reasons).toContain("Market data is stale");
  });

  it("yields MEDIUM confidence when secondary context and volume are missing", () => {
    const result = assessConfidence({
      qualityStatus: "DELAYED",
      freshness: "DELAYED",
      hasValidBaseline: true,
      hasProviderConflict: false,
      hasCorporateActionCoverage: true,
      hasBenchmarkContext: false,
      hasSectorContext: false,
      hasVolumeHistory: false,
    });

    expect(result.confidence).toBe("MEDIUM");
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.4);
    expect(result.confidenceScore).toBeLessThan(0.7);
  });
});
