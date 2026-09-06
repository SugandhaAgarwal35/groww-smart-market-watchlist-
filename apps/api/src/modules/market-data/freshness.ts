import type { FreshnessStatus, MarketSessionStatus } from "@watchlist/contracts";

export interface FreshnessOptions {
  observedAt: string | Date;
  currentTime?: Date;
  sessionStatus?: MarketSessionStatus;
}

export function classifyFreshness({
  observedAt,
  currentTime = new Date(),
  sessionStatus = "OPEN",
}: FreshnessOptions): FreshnessStatus {
  const date = typeof observedAt === "string" ? new Date(observedAt) : observedAt;
  const timeMs = date.getTime();

  if (Number.isNaN(timeMs)) {
    return "UNKNOWN";
  }

  const ageSeconds = Math.floor((currentTime.getTime() - timeMs) / 1000);

  // If timestamp is unreasonably in the future (>10s drift)
  if (ageSeconds < -10) {
    return "UNKNOWN";
  }

  // If market is closed, older observations are expected
  if (sessionStatus === "CLOSED" || sessionStatus === "POST_CLOSE") {
    return ageSeconds <= 86400 ? "FRESH" : "STALE";
  }

  if (ageSeconds <= 60) {
    return "FRESH";
  }

  if (ageSeconds <= 300) {
    return "DELAYED";
  }

  return "STALE";
}
