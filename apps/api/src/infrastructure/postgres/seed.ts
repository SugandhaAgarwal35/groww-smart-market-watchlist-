import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";
import { query, pool } from "./pool.js";
import { ingestMarketData } from "../../workers/market-ingestion.worker.js";

export async function seedDatabase() {
  console.log("🌱 Seeding database...");

  // 1. Demo user
  const passwordHash = await bcrypt.hash("Password123!", 10);
  const userId = "00000000-0000-0000-0000-000000000001";

  await query(
    `INSERT INTO users (id, email, password_hash, name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET password_hash = $3, name = $4`,
    [userId, "demo@groww.in", passwordHash, "Demo Trader"]
  );
  console.log("✓ Demo user created (demo@groww.in / Password123!)");

  // 2. Sectors
  const itId = "10000000-0000-0000-0000-000000000001";
  const energyId = "10000000-0000-0000-0000-000000000002";
  const bankingId = "10000000-0000-0000-0000-000000000003";
  const autoId = "10000000-0000-0000-0000-000000000004";
  const fmcgId = "10000000-0000-0000-0000-000000000005";
  const metalsId = "10000000-0000-0000-0000-000000000006";
  const telecomId = "10000000-0000-0000-0000-000000000007";
  const consumerId = "10000000-0000-0000-0000-000000000008";
  const pharmaId = "10000000-0000-0000-0000-000000000009";

  await query(
    `INSERT INTO sectors (id, name) VALUES
     ($1, 'Information Technology'),
     ($2, 'Energy'),
     ($3, 'Banking'),
     ($4, 'Automobile'),
     ($5, 'FMCG'),
     ($6, 'Metals'),
     ($7, 'Telecom'),
     ($8, 'Consumer Services'),
     ($9, 'Pharmaceuticals')
     ON CONFLICT (name) DO NOTHING`,
    [itId, energyId, bankingId, autoId, fmcgId, metalsId, telecomId, consumerId, pharmaId]
  );
  console.log("✓ Sectors seeded");

  // 3. Securities (Top 20 NSE Indian Blue-Chips)
  const securities = [
    { id: "20000000-0000-0000-0000-000000000001", symbol: "INFY", exchange: "NSE", tradingSymbol: "INFY-EQ", name: "Infosys Limited", sectorId: itId },
    { id: "20000000-0000-0000-0000-000000000002", symbol: "TCS", exchange: "NSE", tradingSymbol: "TCS-EQ", name: "Tata Consultancy Services Limited", sectorId: itId },
    { id: "20000000-0000-0000-0000-000000000003", symbol: "RELIANCE", exchange: "NSE", tradingSymbol: "RELIANCE-EQ", name: "Reliance Industries Limited", sectorId: energyId },
    { id: "20000000-0000-0000-0000-000000000004", symbol: "HDFCBANK", exchange: "NSE", tradingSymbol: "HDFCBANK-EQ", name: "HDFC Bank Limited", sectorId: bankingId },
    { id: "20000000-0000-0000-0000-000000000005", symbol: "ICICIBANK", exchange: "NSE", tradingSymbol: "ICICIBANK-EQ", name: "ICICI Bank Limited", sectorId: bankingId },
    { id: "20000000-0000-0000-0000-000000000006", symbol: "SBIN", exchange: "NSE", tradingSymbol: "SBIN-EQ", name: "State Bank of India", sectorId: bankingId },
    { id: "20000000-0000-0000-0000-000000000007", symbol: "WIPRO", exchange: "NSE", tradingSymbol: "WIPRO-EQ", name: "Wipro Limited", sectorId: itId },
    { id: "20000000-0000-0000-0000-000000000008", symbol: "TECHM", exchange: "NSE", tradingSymbol: "TECHM-EQ", name: "Tech Mahindra Limited", sectorId: itId },
    { id: "20000000-0000-0000-0000-000000000009", symbol: "KOTAKBANK", exchange: "NSE", tradingSymbol: "KOTAKBANK-EQ", name: "Kotak Mahindra Bank Limited", sectorId: bankingId },
    { id: "20000000-0000-0000-0000-000000000010", symbol: "AXISBANK", exchange: "NSE", tradingSymbol: "AXISBANK-EQ", name: "Axis Bank Limited", sectorId: bankingId },
    { id: "20000000-0000-0000-0000-000000000011", symbol: "ONGC", exchange: "NSE", tradingSymbol: "ONGC-EQ", name: "Oil & Natural Gas Corp Limited", sectorId: energyId },
    { id: "20000000-0000-0000-0000-000000000012", symbol: "TATAMOTORS", exchange: "NSE", tradingSymbol: "TATAMOTORS-EQ", name: "Tata Motors Limited", sectorId: autoId },
    { id: "20000000-0000-0000-0000-000000000013", symbol: "MARUTI", exchange: "NSE", tradingSymbol: "MARUTI-EQ", name: "Maruti Suzuki India Limited", sectorId: autoId },
    { id: "20000000-0000-0000-0000-000000000014", symbol: "HINDUNILVR", exchange: "NSE", tradingSymbol: "HINDUNILVR-EQ", name: "Hindustan Unilever Limited", sectorId: fmcgId },
    { id: "20000000-0000-0000-0000-000000000015", symbol: "ITC", exchange: "NSE", tradingSymbol: "ITC-EQ", name: "ITC Limited", sectorId: fmcgId },
    { id: "20000000-0000-0000-0000-000000000016", symbol: "TATASTEEL", exchange: "NSE", tradingSymbol: "TATASTEEL-EQ", name: "Tata Steel Limited", sectorId: metalsId },
    { id: "20000000-0000-0000-0000-000000000017", symbol: "BHARTIARTL", exchange: "NSE", tradingSymbol: "BHARTIARTL-EQ", name: "Bharti Airtel Limited", sectorId: telecomId },
    { id: "20000000-0000-0000-0000-000000000018", symbol: "TITAN", exchange: "NSE", tradingSymbol: "TITAN-EQ", name: "Titan Company Limited", sectorId: consumerId },
    { id: "20000000-0000-0000-0000-000000000019", symbol: "SUNPHARMA", exchange: "NSE", tradingSymbol: "SUNPHARMA-EQ", name: "Sun Pharmaceutical Industries Limited", sectorId: pharmaId },
    { id: "20000000-0000-0000-0000-000000000020", symbol: "ZOMATO", exchange: "NSE", tradingSymbol: "ZOMATO-EQ", name: "Zomato Limited", sectorId: consumerId },
  ];

  for (const s of securities) {
    await query(
      `INSERT INTO securities (id, symbol, exchange, trading_symbol, name, sector_id, active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (exchange, trading_symbol) DO UPDATE
       SET name = $5, sector_id = $6, active = true`,
      [s.id, s.symbol, s.exchange, s.tradingSymbol, s.name, s.sectorId]
    );
  }
  console.log("✓ 20 Blue-chip Securities seeded");

  // 4. Benchmarks & Sector observations (only if not already seeded)
  const existingBench = await query("SELECT id FROM benchmark_observations WHERE benchmark_symbol = 'NIFTY' LIMIT 1");
  if (existingBench.rows.length === 0) {
    await query(
      `INSERT INTO benchmark_observations (id, benchmark_symbol, return_pct, price, previous_close, observed_at)
       VALUES ($1, 'NIFTY', -1.0, 24500.0, 24750.0, NOW())`,
      [uuid()]
    );
  }

  const existingSectorObs = await query("SELECT id FROM sector_observations LIMIT 1");
  if (existingSectorObs.rows.length === 0) {
    await query(
      `INSERT INTO sector_observations (id, sector_id, return_pct, observed_at) VALUES
       ($1, $2, -2.4, NOW()),
       ($3, $4, 0.4, NOW()),
       ($5, $6, -0.6, NOW())`,
      [uuid(), itId, uuid(), energyId, uuid(), bankingId]
    );
  }
  console.log("✓ Benchmarks & Sector context seeded");

  // 5. Corporate Actions (Split on TCS - only if not already seeded)
  const existingCa = await query(
    "SELECT id FROM corporate_actions WHERE security_id = $1 AND action_type = 'SPLIT' LIMIT 1",
    ["20000000-0000-0000-0000-000000000002"]
  );
  if (existingCa.rows.length === 0) {
    await query(
      `INSERT INTO corporate_actions (id, security_id, action_type, effective_at, adjustment_factor, source)
       VALUES ($1, $2, 'SPLIT', NOW() - INTERVAL '1 day', 0.5, 'NSE_OFFICIAL')`,
      [uuid(), "20000000-0000-0000-0000-000000000002"]
    );
  }
  console.log("✓ Corporate action seeded (2:1 split on TCS)");

  // 6. Default Watchlist
  const watchlistId = "30000000-0000-0000-0000-000000000001";
  await query(
    `INSERT INTO watchlists (id, user_id, name, position)
     VALUES ($1, $2, 'Primary Core Watchlist', 0)
     ON CONFLICT (id) DO NOTHING`,
    [watchlistId, userId]
  );

  // Add items
  const selectedSecurities = [
    securities[0]!, // INFY
    securities[2]!, // RELIANCE
    securities[3]!, // HDFCBANK
    securities[1]!, // TCS
  ];

  for (let i = 0; i < selectedSecurities.length; i++) {
    const sec = selectedSecurities[i]!;
    await query(
      `INSERT INTO watchlist_items (id, watchlist_id, security_id, position)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (watchlist_id, security_id) DO NOTHING`,
      [uuid(), watchlistId, sec.id, i]
    );
  }
  console.log("✓ Default watchlist created with 4 securities");

  // 7. Run initial market data ingestion (only if no snapshots exist)
  const existingSnap = await query("SELECT id FROM market_snapshots LIMIT 1");
  if (existingSnap.rows.length === 0) {
    console.log("Ingesting initial market observation snapshot...");
    try {
      const snapRes = await ingestMarketData();
      console.log(`✓ Initial snapshot v${snapRes.version} generated.`);
    } catch (ingestErr) {
      console.warn("Notice: Initial market ingestion deferred:", (ingestErr as Error).message);
    }
  }

  // 8. Seed baseline seen state for INFY (only if not already seeded)
  await query(
    `INSERT INTO seen_states (
       id, user_id, watchlist_id, security_id,
       baseline_price, baseline_observed_at, baseline_version, seen_at
     ) VALUES (
       $1, $2, $3, $4,
       1500.0, NOW() - INTERVAL '2 hours', 1, NOW() - INTERVAL '2 hours'
     ) ON CONFLICT (user_id, watchlist_id, security_id) DO NOTHING`,
    [uuid(), userId, watchlistId, securities[0]!.id]
  );
  console.log("✓ Seeded realistic baseline for INFY to demonstrate last-seen intelligence.");

  console.log("🎉 Seeding complete!");
}

if (process.argv[1]?.includes("seed")) {
  seedDatabase()
    .then(() => pool.end())
    .catch((err) => {
      console.error("Seeding error:", err);
      process.exit(1);
    });
}
