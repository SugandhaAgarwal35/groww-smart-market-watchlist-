import type { AttentionLevel, Signal } from "@watchlist/contracts";
import { config } from "../../config/index.js";

export interface SignificanceResult {
  attention: AttentionLevel;
  attentionScore: number;
}

/**
 * Deterministic significance assessment.
 * Uses evidence-first approach — each signal contributes to the final attention level.
 */
export function assessSignificance(signals: Signal[]): SignificanceResult {
  const thresholds = config.significance;

  const priceSignal = signals.find((s) => s.type === "PRICE_CHANGE");
  const marketRelSignal = signals.find((s) => s.type === "MARKET_RELATIVE");
  const sectorRelSignal = signals.find((s) => s.type === "SECTOR_RELATIVE");
  const volumeSignal = signals.find((s) => s.type === "VOLUME_ANOMALY");
  const high52Signal = signals.find((s) => s.type === "HIGH_52W");
  const low52Signal = signals.find((s) => s.type === "LOW_52W");

  let score = 0;

  // Price change contribution (0 - 4 points)
  if (priceSignal?.status === "VALID" && priceSignal.value != null) {
    const absPriceMove = Math.abs(priceSignal.value);
    if (absPriceMove >= thresholds.priceMove.high) {
      score += 4;
    } else if (absPriceMove >= thresholds.priceMove.medium) {
      score += 2;
    } else if (absPriceMove >= 0.5) {
      score += 0.5;
    }
  }

  // Market-relative contribution (0 - 3 points)
  // This is the key contextualizer — reduces significance of market-wide moves
  if (marketRelSignal?.status === "VALID" && marketRelSignal.value != null) {
    const absRelMove = Math.abs(marketRelSignal.value);
    if (absRelMove >= thresholds.marketRelative.high) {
      score += 3;
    } else if (absRelMove >= thresholds.marketRelative.medium) {
      score += 1.5;
    }
  } else if (priceSignal?.status === "VALID" && priceSignal.value != null) {
    // No benchmark context — don't penalize, but note that the move is uncontextualized
    const absPriceMove = Math.abs(priceSignal.value);
    if (absPriceMove >= thresholds.priceMove.high) {
      score += 1; // Small additional credit for large raw moves
    }
  }

  // Sector-relative bonus (0 - 1 point)
  if (sectorRelSignal?.status === "VALID" && sectorRelSignal.value != null) {
    const absSectorRel = Math.abs(sectorRelSignal.value);
    if (absSectorRel >= thresholds.sectorRelative.high) {
      score += 1;
    } else if (absSectorRel >= thresholds.sectorRelative.medium) {
      score += 0.5;
    }
  }

  // Volume contribution (0 - 2 points)
  if (volumeSignal?.status === "VALID" && volumeSignal.value != null) {
    if (volumeSignal.value >= thresholds.volumeRatio.high) {
      score += 2;
    } else if (volumeSignal.value >= thresholds.volumeRatio.medium) {
      score += 1;
    }
  }

  // Level contribution (0 - 1.5 points)
  if (high52Signal?.status === "VALID" && high52Signal.value === 1) {
    score += 1.5;
  }
  if (low52Signal?.status === "VALID" && low52Signal.value === 1) {
    score += 1.5;
  }

  // Map score to attention level
  let attention: AttentionLevel;
  if (score >= 6) {
    attention = "HIGH";
  } else if (score >= 3) {
    attention = "MEDIUM";
  } else if (score >= 1) {
    attention = "LOW";
  } else {
    attention = "NONE";
  }

  return {
    attention,
    attentionScore: Math.round(score * 100) / 100,
  };
}
