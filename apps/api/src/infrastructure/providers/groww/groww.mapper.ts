import type {
  ProviderInstrument,
  RawMarketObservation,
} from "../provider.interface.js";
import type { GrowwQuoteResponse, GrowwOhlc } from "./groww.client.js";

export function parseOhlc(rawOhlc?: GrowwOhlc | string | null): GrowwOhlc | null {
  if (!rawOhlc) return null;
  if (typeof rawOhlc === "object") return rawOhlc;
  if (typeof rawOhlc === "string") {
    try {
      return JSON.parse(rawOhlc);
    } catch {
      try {
        const cleaned = rawOhlc
          .replace(/[{}"']/g, "")
          .split(",")
          .reduce((acc, pair) => {
            const [k, v] = pair.split(":").map((s) => s.trim());
            if (k && v) {
              const num = parseFloat(v);
              if (!isNaN(num)) {
                (acc as any)[k] = num;
              }
            }
            return acc;
          }, {} as GrowwOhlc);
        return Object.keys(cleaned).length > 0 ? cleaned : null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function mapGrowwQuoteToObservation(
  instrument: ProviderInstrument,
  quote: GrowwQuoteResponse,
  fallbackObservedAt = new Date().toISOString()
): RawMarketObservation {
  const ohlc = parseOhlc(quote.ohlc);

  const price = quote.last_price ?? quote.ltp ?? 0;
  const previousClose = ohlc?.close ?? quote.close_price ?? quote.prev_close ?? null;

  let dayChange = quote.day_change ?? null;
  let dayChangePct =
    quote.day_change_perc ??
    quote.day_change_percentage ??
    quote.day_change_pct ??
    null;

  if (dayChange === null && previousClose !== null && price > 0) {
    dayChange = Number((price - previousClose).toFixed(2));
  }
  if (dayChangePct === null && dayChange !== null && previousClose !== null && previousClose > 0) {
    dayChangePct = Number(((dayChange / previousClose) * 100).toFixed(2));
  }

  let observedAt = fallbackObservedAt;
  if (quote.last_trade_time) {
    try {
      const dt =
        typeof quote.last_trade_time === "number"
          ? new Date(quote.last_trade_time)
          : new Date(quote.last_trade_time);
      if (!isNaN(dt.getTime())) {
        observedAt = dt.toISOString();
      }
    } catch {
      // Use fallback
    }
  }

  const openPrice = ohlc?.open ?? quote.open_price ?? null;
  const highPrice = ohlc?.high ?? quote.high_price ?? null;
  const lowPrice = ohlc?.low ?? quote.low_price ?? null;

  return {
    securityId: instrument.securityId,
    symbol: instrument.symbol,
    exchange: instrument.exchange,
    provider: "groww",
    sourceEventId: `groww-${instrument.symbol}-${Date.now()}`,
    price,
    volume: quote.volume ?? quote.last_trade_quantity ?? null,
    dayChange,
    dayChangePct,
    openPrice,
    highPrice,
    lowPrice,
    previousClose,
    week52High: quote.week_52_high ?? null,
    week52Low: quote.week_52_low ?? null,
    observedAt,
  };
}
