import type {
  NormalizedQuote,
  DataQualityStatus,
} from "@watchlist/contracts";
import type { RawMarketObservation } from "../../infrastructure/providers/provider.interface.js";

export function normalizeRawObservation(
  raw: RawMarketObservation,
  overrideQuality?: DataQualityStatus
): NormalizedQuote {
  let qualityStatus: DataQualityStatus = overrideQuality ?? "TRUSTED";

  // Validate critical fields
  if (
    !raw.securityId ||
    typeof raw.price !== "number" ||
    Number.isNaN(raw.price) ||
    raw.price <= 0 ||
    !raw.observedAt ||
    Number.isNaN(new Date(raw.observedAt).getTime())
  ) {
    qualityStatus = "INVALID";
  }

  return {
    securityId: raw.securityId,
    provider: raw.provider,
    sourceEventId: raw.sourceEventId ?? null,
    price: raw.price,
    volume: raw.volume ?? null,
    dayChange: raw.dayChange ?? null,
    dayChangePct: raw.dayChangePct ?? null,
    openPrice: raw.openPrice ?? null,
    highPrice: raw.highPrice ?? null,
    lowPrice: raw.lowPrice ?? null,
    previousClose: raw.previousClose ?? null,
    week52High: raw.week52High ?? null,
    week52Low: raw.week52Low ?? null,
    observedAt: raw.observedAt,
    qualityStatus,
  };
}
