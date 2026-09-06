import { v4 as uuid } from "uuid";
import { query } from "../infrastructure/postgres/pool.js";
import { getMarketDataProvider } from "../infrastructure/providers/provider.factory.js";
import { demoProvider } from "../infrastructure/providers/demo/demo.provider.js";
import { normalizeRawObservation } from "../modules/market-data/normalization.js";
import { marketSnapshotService } from "../modules/market-data/snapshot.service.js";
import type { ProviderInstrument } from "../infrastructure/providers/provider.interface.js";

interface SecurityRow {
  id: string;
  symbol: string;
  exchange: string;
  trading_symbol: string;
  sector_id: string | null;
}

export async function ingestMarketData(): Promise<{
  insertedCount: number;
  snapshotId: string;
  version: number;
}> {
  // 1. Fetch active securities
  const secRes = await query<SecurityRow>(
    `SELECT id, symbol, exchange, trading_symbol, sector_id
     FROM securities
     WHERE active = true`
  );

  if (secRes.rows.length === 0) {
    return { insertedCount: 0, snapshotId: "", version: 0 };
  }

  const instruments: ProviderInstrument[] = secRes.rows.map((r) => ({
    securityId: r.id,
    symbol: r.symbol,
    exchange: r.exchange,
    tradingSymbol: r.trading_symbol,
  }));

  // 2. Fetch raw quotes from active provider (Groww or Demo)
  const provider = getMarketDataProvider();
  const rawQuotes = await provider.getQuotes(instruments);

  const currentScenario = provider.name === "demo" ? demoProvider.getScenario() : "NORMAL";

  // 3. Normalize & insert observations
  const insertedObservationIds: string[] = [];

  for (const raw of rawQuotes) {
    let qualityOverride: import("@watchlist/contracts").DataQualityStatus | undefined;
    if (currentScenario === "DATA_CONFLICT" && raw.symbol === "INFY") {
      qualityOverride = "CONFLICTED";
    } else if (currentScenario === "DATA_DELAY") {
      qualityOverride = "DELAYED";
    }

    const normalized = normalizeRawObservation(raw, qualityOverride);
    const observationId = uuid();

    await query(
      `INSERT INTO market_observations (
         id, security_id, provider, source_event_id,
         price, volume, day_change, day_change_pct,
         open_price, high_price, low_price, previous_close,
         week_52_high, week_52_low, observed_at, quality_status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        observationId,
        normalized.securityId,
        normalized.provider,
        normalized.sourceEventId,
        normalized.price,
        normalized.volume,
        normalized.dayChange,
        normalized.dayChangePct,
        normalized.openPrice,
        normalized.highPrice,
        normalized.lowPrice,
        normalized.previousClose,
        normalized.week52High,
        normalized.week52Low,
        new Date(normalized.observedAt),
        normalized.qualityStatus,
      ]
    );

    insertedObservationIds.push(observationId);
  }

  // 4. Create coherent market snapshot
  const snapshot = await marketSnapshotService.createSnapshot(insertedObservationIds);

  // 5. Update benchmark observation (e.g. NIFTY) with snapshot link
  let benchmarkReturn = 0.0;
  let benchmarkPrice: number | null = null;
  let benchmarkPrevClose: number | null = null;

  if (provider.name === "groww") {
    // In production, query NIFTY from configured market-data provider
    try {
      const benchmarkQuotes = await provider.getQuotes([
        {
          securityId: "00000000-0000-0000-0000-000000000000",
          symbol: "NIFTY",
          exchange: "NSE",
          tradingSymbol: "NIFTY",
        },
      ]);
      const niftyQuote = benchmarkQuotes.find(
        (q) => q.symbol === "NIFTY" || q.symbol === "NIFTY 50"
      );
      if (niftyQuote && niftyQuote.price > 0) {
        benchmarkPrice = niftyQuote.price;
        benchmarkPrevClose = niftyQuote.previousClose;
        benchmarkReturn = niftyQuote.dayChangePct ?? 0;
      }
    } catch {
      // If index endpoint not available, compute constituent average return
    }

    if (benchmarkPrice === null) {
      const validChanges = rawQuotes.filter((r) => r.dayChangePct != null).map((r) => r.dayChangePct!);
      if (validChanges.length > 0) {
        benchmarkReturn = Number((validChanges.reduce((a, b) => a + b, 0) / validChanges.length).toFixed(4));
      }
      // Never fabricate synthetic prices in production
    }
  } else {
    // Demo mode: scenario-driven benchmark values
    switch (currentScenario) {
      case "MARKET_WIDE_DROP":
        benchmarkReturn = -4.85;
        benchmarkPrice = 23311.75;
        benchmarkPrevClose = 24500.0;
        break;
      case "BIG_MOVE":
        benchmarkReturn = -0.95;
        benchmarkPrice = 24267.25;
        benchmarkPrevClose = 24500.0;
        break;
      case "VOLUME_SPIKE":
        benchmarkReturn = 0.45;
        benchmarkPrice = 24610.25;
        benchmarkPrevClose = 24500.0;
        break;
      case "DATA_DELAY":
        benchmarkReturn = 0.10;
        benchmarkPrice = 24524.50;
        benchmarkPrevClose = 24500.0;
        break;
      case "DATA_CONFLICT":
        benchmarkReturn = 0.30;
        benchmarkPrice = 24573.50;
        benchmarkPrevClose = 24500.0;
        break;
      case "LATE_OBSERVATION":
        benchmarkReturn = -0.15;
        benchmarkPrice = 24463.25;
        benchmarkPrevClose = 24500.0;
        break;
      case "CORPORATE_ACTION":
        benchmarkReturn = 0.20;
        benchmarkPrice = 24549.00;
        benchmarkPrevClose = 24500.0;
        break;
      case "NORMAL":
      default:
        benchmarkReturn = 0.25;
        benchmarkPrice = 24561.25;
        benchmarkPrevClose = 24500.0;
        break;
    }
  }

  const benchmarkId = uuid();
  await query(
    `INSERT INTO benchmark_observations (
       id, benchmark_symbol, return_pct, price, previous_close, observed_at, snapshot_id
     ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
    [benchmarkId, "NIFTY", benchmarkReturn, benchmarkPrice, benchmarkPrevClose, snapshot.id]
  );

  // 6. Compute & insert sector observations with snapshot link
  const sectorMap = new Map<string, { totalPct: number; count: number }>();
  for (const raw of rawQuotes) {
    const sec = secRes.rows.find((r) => r.id === raw.securityId);
    if (sec?.sector_id && raw.dayChangePct != null) {
      const entry = sectorMap.get(sec.sector_id) ?? { totalPct: 0, count: 0 };
      entry.totalPct += raw.dayChangePct;
      entry.count += 1;
      sectorMap.set(sec.sector_id, entry);
    }
  }

  for (const [sectorId, stat] of sectorMap.entries()) {
    const avgReturnPct = Number((stat.totalPct / stat.count).toFixed(4));
    const sectorObsId = uuid();
    await query(
      `INSERT INTO sector_observations (
         id, sector_id, return_pct, observed_at, snapshot_id
       ) VALUES ($1, $2, $3, NOW(), $4)`,
      [sectorObsId, sectorId, avgReturnPct, snapshot.id]
    );
  }

  return {
    insertedCount: insertedObservationIds.length,
    snapshotId: snapshot.id,
    version: snapshot.version,
  };
}

// If run directly via CLI (npm run worker)
if (process.argv[1]?.includes("market-ingestion.worker")) {
  console.log("Starting Market Ingestion Worker...");
  setInterval(async () => {
    try {
      const res = await ingestMarketData();
      console.log(`[Ingestion] Monotonic Snapshot v${res.version} created with ${res.insertedCount} observations.`);
    } catch (err) {
      console.error("[Ingestion] Error:", err);
    }
  }, 30_000);
}
