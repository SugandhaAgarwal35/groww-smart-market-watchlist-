import type { Signal } from "@watchlist/contracts";

/**
 * Build structured explanation facts from validated signals.
 * Never invents causes not in evidence.
 */
export function buildExplanation(
  signals: Signal[],
  options: {
    isFirstView: boolean;
    marketSession: string;
    freshness: string;
    confidenceLevel: string;
    confidenceReasons: string[];
  }
): string[] {
  const facts: string[] = [];

  if (options.isFirstView) {
    facts.push("This is your first time viewing this security.");
    facts.push("Changes will be tracked from this point forward.");
    return facts;
  }

  // Price change
  const priceSignal = signals.find((s) => s.type === "PRICE_CHANGE" && s.status === "VALID");
  if (priceSignal?.value != null) {
    const direction = priceSignal.value >= 0 ? "up" : "down";
    const absValue = Math.abs(priceSignal.value);
    facts.push(
      `${direction === "up" ? "Up" : "Down"} ${absValue}% since your last check`
    );
  }

  // Market-relative
  const marketRelSignal = signals.find((s) => s.type === "MARKET_RELATIVE" && s.status === "VALID");
  if (marketRelSignal?.value != null) {
    const abs = Math.abs(marketRelSignal.value);
    if (abs >= 0.5) {
      const word = marketRelSignal.value >= 0 ? "Outperforming" : "Underperforming";
      facts.push(`${word} the benchmark by ${abs} pp`);
    }
  }

  // Sector-relative
  const sectorRelSignal = signals.find((s) => s.type === "SECTOR_RELATIVE" && s.status === "VALID");
  if (sectorRelSignal?.value != null) {
    const abs = Math.abs(sectorRelSignal.value);
    if (abs >= 1.0) {
      const word = sectorRelSignal.value >= 0 ? "Outperforming" : "Underperforming";
      facts.push(`${word} its sector by ${abs} pp`);
    }
  }

  // Volume anomaly
  const volumeSignal = signals.find((s) => s.type === "VOLUME_ANOMALY" && s.status === "VALID");
  if (volumeSignal?.value != null && volumeSignal.value >= 1.5) {
    facts.push(`Volume is ${volumeSignal.value}× its recent baseline`);
  }

  // 52-week levels
  const high52 = signals.find((s) => s.type === "HIGH_52W" && s.status === "VALID");
  if (high52?.value === 1) {
    facts.push("At or near 52-week high");
  }

  const low52 = signals.find((s) => s.type === "LOW_52W" && s.status === "VALID");
  if (low52?.value === 1) {
    facts.push("At or near 52-week low");
  }

  // Data quality notes
  if (options.freshness === "STALE") {
    facts.push("Note: Market data may be stale");
  } else if (options.freshness === "DELAYED") {
    facts.push("Note: Market data is slightly delayed");
  }

  if (options.confidenceLevel === "LOW") {
    const reason = options.confidenceReasons[0] ?? "Data quality concern";
    facts.push(`⚠ Low confidence — ${reason.toLowerCase()}`);
  }

  if (options.marketSession === "CLOSED") {
    facts.push("Market is currently closed");
  }

  if (facts.length === 0) {
    facts.push("No significant changes detected");
  }

  return facts;
}
