import type { ConfidenceLevel, DataQualityStatus, FreshnessStatus } from "@watchlist/contracts";

export interface ConfidenceInput {
  qualityStatus: DataQualityStatus;
  freshness: FreshnessStatus;
  hasValidBaseline: boolean;
  hasProviderConflict: boolean;
  hasCorporateActionCoverage: boolean;
  hasBenchmarkContext: boolean;
  hasSectorContext: boolean;
  hasVolumeHistory: boolean;
}

export interface ConfidenceResult {
  confidence: ConfidenceLevel;
  confidenceScore: number;
  reasons: string[];
}

/**
 * Confidence assessment — separate from attention.
 * A stock can be HIGH attention + LOW confidence (e.g., big move but data conflict).
 */
export function assessConfidence(input: ConfidenceInput): ConfidenceResult {
  const reasons: string[] = [];
  let score = 1.0; // Start at full confidence

  // ── Critical factors (can force LOW) ──────────────────────

  if (input.qualityStatus === "INVALID") {
    score = 0.1;
    reasons.push("Market data is invalid");
    return { confidence: "LOW", confidenceScore: score, reasons };
  }

  if (input.qualityStatus === "CONFLICTED" || input.hasProviderConflict) {
    score -= 0.65;
    reasons.push("Data conflict between sources");
  }

  if (input.freshness === "STALE") {
    score -= 0.65;
    reasons.push("Market data is stale");
  }

  if (!input.hasValidBaseline) {
    score -= 0.3;
    reasons.push("No valid baseline observation");
  }

  if (!input.hasCorporateActionCoverage) {
    score -= 0.2;
    reasons.push("Corporate action status uncertain");
  }

  if (input.qualityStatus === "DELAYED" || input.freshness === "DELAYED") {
    score -= 0.15;
    reasons.push("Market data is delayed");
  }

  // ── Non-critical factors (may reduce to MEDIUM) ───────────

  if (!input.hasBenchmarkContext) {
    score -= 0.1;
    reasons.push("Benchmark context unavailable");
  }

  if (!input.hasSectorContext) {
    score -= 0.05;
    reasons.push("Sector context unavailable");
  }

  if (!input.hasVolumeHistory) {
    score -= 0.05;
    reasons.push("Volume history unavailable");
  }

  // Clamp score
  score = Math.max(0, Math.min(1, score));

  // Map to confidence level
  let confidence: ConfidenceLevel;
  if (score >= 0.7) {
    confidence = "HIGH";
  } else if (score >= 0.4) {
    confidence = "MEDIUM";
  } else {
    confidence = "LOW";
  }

  if (reasons.length === 0) {
    reasons.push("All data sources validated");
  }

  return {
    confidence,
    confidenceScore: Math.round(score * 100) / 100,
    reasons,
  };
}
