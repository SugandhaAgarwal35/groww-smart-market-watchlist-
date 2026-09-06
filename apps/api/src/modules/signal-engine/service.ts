import type {
  SignalType,
  SignalStatus,
  Signal,
} from "@watchlist/contracts";

// ──────────────────────────────────────────────────────────────
// Signal Engine — Pure Functions, No I/O
// ──────────────────────────────────────────────────────────────

export interface SignalInput {
  currentPrice: number | null;
  baselinePrice: number | null;
  previousClose: number | null;
  benchmarkReturnPct: number | null;
  sectorReturnPct: number | null;
  currentVolume: number | null;
  expectedVolume: number | null;
  week52High: number | null;
  week52Low: number | null;
  corporateActionAdjustmentFactor: number | null;
}

/**
 * Calculate all signals from supplied inputs.
 * This function never accesses I/O — it's pure and testable.
 */
export function calculateSignals(input: SignalInput): Signal[] {
  const signals: Signal[] = [];

  signals.push(calculatePriceChange(input));
  signals.push(calculateMarketRelative(input));
  signals.push(calculateSectorRelative(input));
  signals.push(calculateVolumeAnomaly(input));
  signals.push(calculateLevel(input, "HIGH_52W"));
  signals.push(calculateLevel(input, "LOW_52W"));

  return signals;
}

function calculatePriceChange(input: SignalInput): Signal {
  const { currentPrice, baselinePrice, corporateActionAdjustmentFactor } = input;

  if (currentPrice == null || baselinePrice == null || baselinePrice <= 0) {
    return makeSignal("PRICE_CHANGE", null, "PERCENT", "NOT_AVAILABLE", "Missing baseline or current price");
  }

  // Apply corporate action adjustment
  const adjustedBaseline = corporateActionAdjustmentFactor != null
    ? baselinePrice * corporateActionAdjustmentFactor
    : baselinePrice;

  if (adjustedBaseline <= 0) {
    return makeSignal("PRICE_CHANGE", null, "PERCENT", "INVALID", "Adjusted baseline is zero or negative");
  }

  const changePct = ((currentPrice - adjustedBaseline) / adjustedBaseline) * 100;

  return makeSignal(
    "PRICE_CHANGE",
    round(changePct, 2),
    "PERCENT",
    "VALID",
    corporateActionAdjustmentFactor != null
      ? `${changePct >= 0 ? "+" : ""}${round(changePct, 2)}% (corporate-action adjusted)`
      : `${changePct >= 0 ? "+" : ""}${round(changePct, 2)}%`
  );
}

function calculateMarketRelative(input: SignalInput): Signal {
  const { currentPrice, baselinePrice, benchmarkReturnPct, previousClose, corporateActionAdjustmentFactor } = input;

  if (benchmarkReturnPct == null) {
    return makeSignal("MARKET_RELATIVE", null, "PERCENTAGE_POINTS", "NOT_AVAILABLE", "Benchmark data unavailable");
  }

  // Calculate security return
  let securityReturnPct: number;

  if (baselinePrice != null && baselinePrice > 0 && currentPrice != null) {
    const adjustedBaseline = corporateActionAdjustmentFactor != null
      ? baselinePrice * corporateActionAdjustmentFactor
      : baselinePrice;
    securityReturnPct = ((currentPrice - adjustedBaseline) / adjustedBaseline) * 100;
  } else if (previousClose != null && previousClose > 0 && currentPrice != null) {
    securityReturnPct = ((currentPrice - previousClose) / previousClose) * 100;
  } else {
    return makeSignal("MARKET_RELATIVE", null, "PERCENTAGE_POINTS", "NOT_AVAILABLE", "Cannot calculate security return");
  }

  const relativeMove = securityReturnPct - benchmarkReturnPct;

  return makeSignal(
    "MARKET_RELATIVE",
    round(relativeMove, 2),
    "PERCENTAGE_POINTS",
    "VALID",
    `${relativeMove >= 0 ? "+" : ""}${round(relativeMove, 2)} pp vs benchmark`
  );
}

function calculateSectorRelative(input: SignalInput): Signal {
  const { currentPrice, baselinePrice, sectorReturnPct, previousClose, corporateActionAdjustmentFactor } = input;

  if (sectorReturnPct == null) {
    return makeSignal("SECTOR_RELATIVE", null, "PERCENTAGE_POINTS", "NOT_AVAILABLE", "Sector data unavailable");
  }

  let securityReturnPct: number;

  if (baselinePrice != null && baselinePrice > 0 && currentPrice != null) {
    const adjustedBaseline = corporateActionAdjustmentFactor != null
      ? baselinePrice * corporateActionAdjustmentFactor
      : baselinePrice;
    securityReturnPct = ((currentPrice - adjustedBaseline) / adjustedBaseline) * 100;
  } else if (previousClose != null && previousClose > 0 && currentPrice != null) {
    securityReturnPct = ((currentPrice - previousClose) / previousClose) * 100;
  } else {
    return makeSignal("SECTOR_RELATIVE", null, "PERCENTAGE_POINTS", "NOT_AVAILABLE", "Cannot calculate security return");
  }

  const relativeMove = securityReturnPct - sectorReturnPct;

  return makeSignal(
    "SECTOR_RELATIVE",
    round(relativeMove, 2),
    "PERCENTAGE_POINTS",
    "VALID",
    `${relativeMove >= 0 ? "+" : ""}${round(relativeMove, 2)} pp vs sector`
  );
}

function calculateVolumeAnomaly(input: SignalInput): Signal {
  const { currentVolume, expectedVolume } = input;

  if (currentVolume == null || expectedVolume == null || expectedVolume <= 0) {
    return makeSignal("VOLUME_ANOMALY", null, "RATIO", "NOT_AVAILABLE", "Volume data unavailable");
  }

  const ratio = currentVolume / expectedVolume;

  return makeSignal(
    "VOLUME_ANOMALY",
    round(ratio, 2),
    "RATIO",
    "VALID",
    `${round(ratio, 1)}× typical volume`
  );
}

function calculateLevel(input: SignalInput, type: "HIGH_52W" | "LOW_52W"): Signal {
  const { currentPrice, week52High, week52Low } = input;

  if (currentPrice == null) {
    return makeSignal(type, null, "BOOLEAN", "NOT_AVAILABLE", "Current price unavailable");
  }

  if (type === "HIGH_52W") {
    if (week52High == null) {
      return makeSignal(type, null, "BOOLEAN", "NOT_AVAILABLE", "52-week high unavailable");
    }
    const isNew = currentPrice >= week52High * 0.9999; // epsilon
    return makeSignal(type, isNew ? 1 : 0, "BOOLEAN", "VALID", isNew ? "At or near 52-week high" : "Below 52-week high");
  } else {
    if (week52Low == null) {
      return makeSignal(type, null, "BOOLEAN", "NOT_AVAILABLE", "52-week low unavailable");
    }
    const isNew = currentPrice <= week52Low * 1.0001; // epsilon
    return makeSignal(type, isNew ? 1 : 0, "BOOLEAN", "VALID", isNew ? "At or near 52-week low" : "Above 52-week low");
  }
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function makeSignal(
  type: SignalType,
  value: number | null,
  unit: string,
  status: SignalStatus,
  contribution: string
): Signal {
  return { type, value, unit, status, contribution };
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
