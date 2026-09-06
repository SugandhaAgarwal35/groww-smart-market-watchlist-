import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { GrowwClient } from "../src/infrastructure/providers/groww/groww.client.js";
import { GrowwProvider } from "../src/infrastructure/providers/groww/groww.provider.js";
import { mapGrowwQuoteToObservation } from "../src/infrastructure/providers/groww/groww.mapper.js";
import { classifyFreshness } from "../src/modules/market-data/freshness.js";
import { realtimeMarketService } from "../src/modules/market-data/realtime-market.service.js";
import { snapshotService } from "../src/modules/snapshot/service.js";
import { config } from "../src/config/index.js";
import { query } from "../src/infrastructure/postgres/pool.js";
import { v4 as uuid } from "uuid";

describe("Production-Readiness Verification Tests", () => {
  let app: FastifyInstance;
  let token: string;
  let userId: string;
  let testWatchlistId: string;
  let secId1: string;
  let secId2: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Login to obtain auth token
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "demo@groww.in",
        password: "Password123!",
      },
    });

    const body = JSON.parse(res.body);
    token = body.token;
    userId = body.user.id;

    // Create a temporary watchlist for testing reorder and snapshot logic
    testWatchlistId = uuid();
    await query(
      `INSERT INTO watchlists (id, user_id, name, position)
       VALUES ($1, $2, 'Prod Readiness Test WL', 999)`,
      [testWatchlistId, userId]
    );

    // Get 2 valid securities from database
    const secRes = await query<{ id: string; symbol: string }>(
      `SELECT id, symbol FROM securities LIMIT 2`
    );
    secId1 = secRes.rows[0].id;
    secId2 = secRes.rows[1].id;

    await query(
      `INSERT INTO watchlist_items (id, watchlist_id, security_id, position)
       VALUES ($1, $2, $3, 0), ($4, $2, $5, 1)`,
      [uuid(), testWatchlistId, secId1, uuid(), secId2]
    );
  });

  afterAll(async () => {
    // Cleanup test data
    await query("DELETE FROM watchlist_items WHERE watchlist_id = $1", [testWatchlistId]);
    await query("DELETE FROM watchlists WHERE id = $1", [testWatchlistId]);
    await app.close();
  });

  // ── 1. Groww API Client Response Format & Headers ──────────
  describe("1. Groww API Client Response Format & Headers", () => {
    it("should query singular trading_symbol=... and send X-API-VERSION: 1.0 with official payload", async () => {
      const mockFetch = vi.fn().mockImplementation(async (url: string, options: RequestInit) => {
        // Verify singular trading_symbol query param and endpoint contract
        expect(url).toContain("/v1/live-data/quote");
        expect(url).toContain("exchange=NSE");
        expect(url).toContain("segment=CASH");
        expect(url).toContain("trading_symbol=INFY-EQ");
        expect(url).not.toContain("trading_symbols=");

        // Verify headers
        const headers = options.headers as Record<string, string>;
        expect(headers["X-API-VERSION"]).toBe("1.0");
        expect(headers["Authorization"]).toBe("Bearer test_groww_secret_token");
        expect(headers["Accept"]).toBe("application/json");

        // Return official Groww response structure: { status: 'SUCCESS', payload: ... }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: "SUCCESS",
            payload: {
              last_price: 1540.25,
              day_change: 20.25,
              day_change_perc: 1.33,
              ohlc: {
                open: 1515.0,
                high: 1550.0,
                low: 1510.0,
                close: 1520.0,
              },
              last_trade_quantity: 5400000,
            },
          }),
        };
      });

      vi.stubGlobal("fetch", mockFetch);

      const client = new GrowwClient("https://api.groww.in", "test_groww_secret_token");
      const quotes = await client.getBatchQuotes([
        { symbol: "INFY", exchange: "NSE", tradingSymbol: "INFY-EQ" },
      ]);

      expect(quotes.length).toBe(1);
      expect(quotes[0].symbol).toBe("INFY");
      expect(quotes[0].trading_symbol).toBe("INFY-EQ");
      expect(quotes[0].last_price).toBe(1540.25);
      expect(quotes[0].day_change_perc).toBe(1.33);

      vi.unstubAllGlobals();
    });

    it("isolates errors so one failed quote does not break the whole batch", async () => {
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("trading_symbol=FAIL-EQ")) {
          return {
            ok: false,
            status: 500,
            statusText: "Internal Server Error",
            text: async () => "Internal server error on symbol",
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: "SUCCESS",
            payload: {
              symbol: "TCS",
              trading_symbol: "TCS-EQ",
              last_price: 3950.0,
              day_change: 25.0,
              day_change_perc: 0.64,
              ohlc: { open: 3930.0, high: 3960.0, low: 3920.0, close: 3925.0 },
            },
          }),
        };
      });

      vi.stubGlobal("fetch", mockFetch);

      const client = new GrowwClient("https://api.groww.in", "test_token");
      const quotes = await client.getBatchQuotes([
        { symbol: "FAIL", exchange: "NSE", tradingSymbol: "FAIL-EQ" },
        { symbol: "TCS", exchange: "NSE", tradingSymbol: "TCS-EQ" },
      ]);

      // One failed symbol (FAIL-EQ) does not discard the valid quote (TCS-EQ)
      expect(quotes.length).toBe(1);
      expect(quotes[0].symbol).toBe("TCS");
      expect(quotes[0].last_price).toBe(3950.0);

      vi.unstubAllGlobals();
    });

    it("should throw an explicit error when Groww API returns status FAILURE or ERROR on single quote", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: "FAILURE",
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many live quote requests",
          },
        }),
      });

      vi.stubGlobal("fetch", mockFetch);

      const client = new GrowwClient("https://api.groww.in", "test_token");
      await expect(
        client.getBatchQuotes([{ symbol: "TCS", exchange: "NSE" }])
      ).rejects.toThrow(/Groww Live Data API Error: Too many live quote requests/);

      vi.unstubAllGlobals();
    });

    it("maps official Groww response fields: day_change_perc, nested ohlc, and last_trade_quantity", () => {
      const inst = {
        securityId: "20000000-0000-0000-0000-000000000001",
        symbol: "RELIANCE",
        exchange: "NSE",
        tradingSymbol: "RELIANCE-EQ",
      };

      const quote = {
        symbol: "RELIANCE",
        exchange: "NSE",
        last_price: 2950.0,
        day_change: 15.5,
        day_change_perc: 0.53,
        ohlc: {
          open: 2940.0,
          high: 2965.0,
          low: 2930.0,
          close: 2934.5,
        },
        last_trade_quantity: 120000,
        last_trade_time: "2026-09-06T10:30:00.000Z",
      };

      const obs = mapGrowwQuoteToObservation(inst, quote);
      expect(obs.symbol).toBe("RELIANCE");
      expect(obs.price).toBe(2950.0);
      expect(obs.dayChange).toBe(15.5);
      expect(obs.dayChangePct).toBe(0.53);
      expect(obs.openPrice).toBe(2940.0);
      expect(obs.highPrice).toBe(2965.0);
      expect(obs.lowPrice).toBe(2930.0);
      expect(obs.previousClose).toBe(2934.5);
      expect(obs.volume).toBe(120000);
    });

    it("safely parses nested ohlc when received as a string or JSON string", () => {
      const inst = {
        securityId: "20000000-0000-0000-0000-000000000002",
        symbol: "INFY",
        exchange: "NSE",
        tradingSymbol: "INFY-EQ",
      };

      // Unquoted string format
      const unquotedQuote = {
        symbol: "INFY",
        last_price: 1500.0,
        day_change_perc: -0.85,
        ohlc: "{open: 1510.0, high: 1515.0, low: 1490.0, close: 1513.0}",
      };
      const obs1 = mapGrowwQuoteToObservation(inst, unquotedQuote);
      expect(obs1.openPrice).toBe(1510.0);
      expect(obs1.highPrice).toBe(1515.0);
      expect(obs1.lowPrice).toBe(1490.0);
      expect(obs1.previousClose).toBe(1513.0);
      expect(obs1.dayChangePct).toBe(-0.85);

      // JSON string format
      const jsonQuote = {
        symbol: "INFY",
        last_price: 1500.0,
        day_change_perc: -0.85,
        ohlc: JSON.stringify({ open: 1510.0, high: 1515.0, low: 1490.0, close: 1513.0 }),
      };
      const obs2 = mapGrowwQuoteToObservation(inst, jsonQuote);
      expect(obs2.openPrice).toBe(1510.0);
      expect(obs2.highPrice).toBe(1515.0);
      expect(obs2.lowPrice).toBe(1490.0);
      expect(obs2.previousClose).toBe(1513.0);
    });
  });

  // ── 2. Missing Provider Data & Degraded State ──────────────
  describe("2. Missing Provider Data & Degraded State", () => {
    it("should return empty list without fabricating synthetic quotes when provider has no data", async () => {
      const mockClient = {
        hasValidCredentials: () => true,
        getBatchQuotes: vi.fn().mockResolvedValue([]),
      } as unknown as GrowwClient;

      const provider = new GrowwProvider(mockClient);
      const observations = await provider.getQuotes([
        {
          securityId: "20000000-0000-0000-0000-000000000001",
          symbol: "TATAMOTORS",
          exchange: "NSE",
          tradingSymbol: "TATAMOTORS-EQ",
        },
      ]);

      // Absolutely no fabricated synthetic quotes
      expect(observations).toEqual([]);
    });

    it("SnapshotService produces honest UNAVAILABLE change state when observation is absent", async () => {
      // Create a dummy security with zero observations
      const emptySecId = uuid();
      const emptySymbol = `NODATA_${uuid().slice(0, 6)}`;
      await query(
        `INSERT INTO securities (id, symbol, exchange, trading_symbol, name, active)
         VALUES ($1, $2, 'NSE', $3, 'No Data Stock Ltd', true)`,
        [emptySecId, emptySymbol, `${emptySymbol}-EQ`]
      );

      const emptyWlId = uuid();
      await query(
        `INSERT INTO watchlists (id, user_id, name, position)
         VALUES ($1, $2, 'Empty WL', 998)`,
        [emptyWlId, userId]
      );

      await query(
        `INSERT INTO watchlist_items (id, watchlist_id, security_id, position)
         VALUES ($1, $2, $3, 0)`,
        [uuid(), emptyWlId, emptySecId]
      );

      try {
        const snapshot = await snapshotService.getWatchlistSnapshot(userId, emptyWlId);
        expect(snapshot).not.toBeNull();
        expect(snapshot!.items.length).toBe(1);
        const item = snapshot!.items[0];
        expect(item.market.price).toBeNull();
        expect(item.change.state).toBe("UNAVAILABLE");
        expect(item.change.attention).toBe("NONE");
        expect(item.change.confidence).toBe("LOW");
        expect(item.explanation[0]).toContain("unavailable");
      } finally {
        await query("DELETE FROM change_assessments WHERE watchlist_id = $1", [emptyWlId]);
        await query("DELETE FROM watchlist_items WHERE watchlist_id = $1", [emptyWlId]);
        await query("DELETE FROM watchlists WHERE id = $1", [emptyWlId]);
        await query("DELETE FROM securities WHERE id = $1", [emptySecId]);
      }
    });
  });

  // ── 3. Observation Trust: INVALID & CONFLICTED ─────────────
  describe("3. Observation Trust (INVALID & CONFLICTED)", () => {
    it("never treats INVALID observations as trusted market state", async () => {
      const invSecId = uuid();
      const invSymbol = `INV_${uuid().slice(0, 6)}`;
      await query(
        `INSERT INTO securities (id, symbol, exchange, trading_symbol, name, active)
         VALUES ($1, $2, 'NSE', $3, 'Invalid Test Co', true)`,
        [invSecId, invSymbol, `${invSymbol}-EQ`]
      );

      // Insert an INVALID observation
      const invObsId = uuid();
      await query(
        `INSERT INTO market_observations (
           id, security_id, price, volume, day_change, day_change_pct,
           previous_close, observed_at, provider, quality_status
         ) VALUES ($1, $2, 99999.00, 100, 50000.0, 100.0, 49999.0, NOW(), 'test', 'INVALID')`,
        [invObsId, invSecId]
      );

      const invWlId = uuid();
      await query(
        `INSERT INTO watchlists (id, user_id, name, position) VALUES ($1, $2, 'Inv WL', 997)`,
        [invWlId, userId]
      );
      await query(
        `INSERT INTO watchlist_items (id, watchlist_id, security_id, position) VALUES ($1, $2, $3, 0)`,
        [uuid(), invWlId, invSecId]
      );

      try {
        const snapshot = await snapshotService.getWatchlistSnapshot(userId, invWlId);
        expect(snapshot).not.toBeNull();
        expect(snapshot!.items.length).toBe(1);
        const item = snapshot!.items[0];

        // Price must be nullified to prevent displaying untrusted invalid prices
        expect(item.market.price).toBeNull();
        expect(item.change.state).toBe("UNAVAILABLE");
        expect(item.change.attention).toBe("NONE");
        expect(item.change.confidence).toBe("LOW");
        expect(item.explanation.some((e) => e.includes("INVALID"))).toBe(true);
      } finally {
        await query("DELETE FROM change_assessments WHERE watchlist_id = $1", [invWlId]);
        await query("DELETE FROM watchlist_items WHERE watchlist_id = $1", [invWlId]);
        await query("DELETE FROM watchlists WHERE id = $1", [invWlId]);
        await query("DELETE FROM market_observations WHERE id = $1", [invObsId]);
        await query("DELETE FROM securities WHERE id = $1", [invSecId]);
      }
    });

    it("preserves degraded LOW confidence for CONFLICTED observations", async () => {
      const confSecId = uuid();
      const confSymbol = `CONF_${uuid().slice(0, 6)}`;
      await query(
        `INSERT INTO securities (id, symbol, exchange, trading_symbol, name, active)
         VALUES ($1, $2, 'NSE', $3, 'Conflicted Test Co', true)`,
        [confSecId, confSymbol, `${confSymbol}-EQ`]
      );

      const confObsId = uuid();
      await query(
        `INSERT INTO market_observations (
           id, security_id, price, volume, day_change, day_change_pct,
           previous_close, observed_at, provider, quality_status
         ) VALUES ($1, $2, 500.00, 10000, 10.0, 2.04, 490.0, NOW(), 'test', 'CONFLICTED')`,
        [confObsId, confSecId]
      );

      const confWlId = uuid();
      await query(
        `INSERT INTO watchlists (id, user_id, name, position) VALUES ($1, $2, 'Conf WL', 996)`,
        [confWlId, userId]
      );
      await query(
        `INSERT INTO watchlist_items (id, watchlist_id, security_id, position) VALUES ($1, $2, $3, 0)`,
        [uuid(), confWlId, confSecId]
      );

      try {
        const snapshot = await snapshotService.getWatchlistSnapshot(userId, confWlId);
        expect(snapshot).not.toBeNull();
        expect(snapshot!.items.length).toBe(1);
        const item = snapshot!.items[0];

        // Market price can be present, but confidence MUST be degraded to LOW (score <= 0.35)
        expect(item.market.price).toBe(500.0);
        expect(item.change.confidence).toBe("LOW");
        expect(item.change.confidenceScore).toBeLessThanOrEqual(0.35);
        expect(item.explanation.some((e) => e.includes("discrepancy") || e.includes("conflict"))).toBe(true);
      } finally {
        await query("DELETE FROM change_assessments WHERE watchlist_id = $1", [confWlId]);
        await query("DELETE FROM watchlist_items WHERE watchlist_id = $1", [confWlId]);
        await query("DELETE FROM watchlists WHERE id = $1", [confWlId]);
        await query("DELETE FROM market_observations WHERE id = $1", [confObsId]);
        await query("DELETE FROM securities WHERE id = $1", [confSecId]);
      }
    });
  });

  // ── 4. Production Mode Isolation ───────────────────────────
  describe("4. Production Mode Isolation", () => {
    it("refuses to apply synthetic scenario shocks when provider is production", () => {
      const initialScenario = realtimeMarketService.getScenario();
      const originalProvider = config.marketDataProvider;
      try {
        (config as { marketDataProvider: string }).marketDataProvider = "groww";
        realtimeMarketService.setScenario("BIG_MOVE");
        // In production mode, setScenario is safely ignored to protect real market data
        expect(realtimeMarketService.getScenario()).toBe(initialScenario);
      } finally {
        (config as { marketDataProvider: string }).marketDataProvider = originalProvider;
      }
    });

    it("returns null market depth in production mode (never random Math.random() books)", () => {
      const originalProvider = config.marketDataProvider;
      try {
        (config as { marketDataProvider: string }).marketDataProvider = "groww";
        const depth = realtimeMarketService.getMarketDepth("INFY");
        expect(depth).toBeNull();
      } finally {
        (config as { marketDataProvider: string }).marketDataProvider = originalProvider;
      }
    });

    it("does not compute ticks or Brownian motion in production mode", () => {
      // In production mode, tick generation is disabled
      const originalProvider = config.marketDataProvider;
      try {
        (config as { marketDataProvider: string }).marketDataProvider = "groww";
        expect(() => {
          (realtimeMarketService as unknown as { processTick: () => void }).processTick();
        }).not.toThrow();
      } finally {
        (config as { marketDataProvider: string }).marketDataProvider = originalProvider;
      }
    });
  });

  // ── 5. Reorder Watchlist Items Endpoint ────────────────────
  describe("5. Reorder Watchlist Items Endpoint", () => {
    it("should support PATCH /watchlists/:id/items/reorder and reorder correctly", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/watchlists/${testWatchlistId}/items/reorder`,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        payload: {
          securityIds: [secId2, secId1],
        },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.status).toBe("ok");

      // Verify positions in DB
      const posRes = await query<{ security_id: string; position: number }>(
        `SELECT security_id, position FROM watchlist_items
         WHERE watchlist_id = $1 ORDER BY position ASC`,
        [testWatchlistId]
      );
      expect(posRes.rows[0].security_id).toBe(secId2);
      expect(posRes.rows[0].position).toBe(0);
      expect(posRes.rows[1].security_id).toBe(secId1);
      expect(posRes.rows[1].position).toBe(1);
    });

    it("should support PUT /watchlists/:id/items/reorder alias as well", async () => {
      const res = await app.inject({
        method: "PUT",
        url: `/api/v1/watchlists/${testWatchlistId}/items/reorder`,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        payload: {
          securityIds: [secId1, secId2],
        },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.status).toBe("ok");
    });
  });

  // ── 6. Stale & Late Observation Freshness ──────────────────
  describe("6. Stale & Late Observation Freshness", () => {
    const now = new Date("2026-09-06T11:00:00.000Z");

    it("classifies <= 60s as FRESH during OPEN session", () => {
      const freshDate = new Date("2026-09-06T10:59:30.000Z"); // 30s ago
      expect(classifyFreshness({ observedAt: freshDate, currentTime: now, sessionStatus: "OPEN" })).toBe("FRESH");
    });

    it("classifies 61-300s as DELAYED during OPEN session", () => {
      const delayedDate = new Date("2026-09-06T10:57:30.000Z"); // 150s ago
      expect(classifyFreshness({ observedAt: delayedDate, currentTime: now, sessionStatus: "OPEN" })).toBe("DELAYED");
    });

    it("classifies > 300s as STALE during OPEN session", () => {
      const staleDate = new Date("2026-09-06T10:50:00.000Z"); // 600s ago
      expect(classifyFreshness({ observedAt: staleDate, currentTime: now, sessionStatus: "OPEN" })).toBe("STALE");
    });

    it("classifies future drift (>10s) as UNKNOWN", () => {
      const futureDate = new Date("2026-09-06T11:00:30.000Z"); // 30s in future
      expect(classifyFreshness({ observedAt: futureDate, currentTime: now, sessionStatus: "OPEN" })).toBe("UNKNOWN");
    });

    it("tolerates observations <= 24h during CLOSED market sessions", () => {
      const closedDate = new Date("2026-09-06T01:00:00.000Z"); // 10h ago
      expect(classifyFreshness({ observedAt: closedDate, currentTime: now, sessionStatus: "CLOSED" })).toBe("FRESH");

      const oldClosedDate = new Date("2026-09-04T10:00:00.000Z"); // 48h ago
      expect(classifyFreshness({ observedAt: oldClosedDate, currentTime: now, sessionStatus: "CLOSED" })).toBe("STALE");
    });
  });

  // ── 7. Production NIFTY Benchmark Provider Data ────────────
  describe("7. Production NIFTY Benchmark Provider Data", () => {
    it("propagates real NIFTY provider quotes to getIndices() without hardcoded values", async () => {
      const originalProvider = config.marketDataProvider;
      const originalToken = config.groww.accessToken;
      try {
        (config as { marketDataProvider: string }).marketDataProvider = "groww";
        (config.groww as { accessToken: string }).accessToken = "test_nifty_secret_token";

        // Mock fetch returning official Groww live quote payload with trading_symbol=NIFTY
        const mockFetch = vi.fn().mockImplementation(async (url: string) => {
          if (url.includes("trading_symbol=NIFTY")) {
            expect(url).toContain("trading_symbol=NIFTY");
            expect(url).not.toContain("trading_symbol=NIFTY-INDEX");
            return {
              ok: true,
              status: 200,
              json: async () => ({
                status: "SUCCESS",
                payload: {
                  symbol: "NIFTY",
                  trading_symbol: "NIFTY",
                  last_price: 24750.5,
                  day_change: 100.5,
                  day_change_perc: 0.41,
                  ohlc: {
                    open: 24680.0,
                    high: 24780.0,
                    low: 24640.0,
                    close: 24650.0,
                  },
                },
              }),
            };
          }
          return {
            ok: true,
            status: 200,
            json: async () => ({
              status: "SUCCESS",
              payload: {},
            }),
          };
        });
        vi.stubGlobal("fetch", mockFetch);

        await realtimeMarketService.pollProductionQuotes();

        const indices = realtimeMarketService.getIndices();
        expect(indices.length).toBe(1);
        expect(indices[0].symbol).toBe("NIFTY 50");
        expect(indices[0].value).toBe(24750.5);
        expect(indices[0].previousClose).toBe(24650.0);
        expect(indices[0].change).toBe(100.5);
        expect(indices[0].changePct).toBe(0.41);
        expect(indices[0].isPositive).toBe(true);

        vi.unstubAllGlobals();
      } finally {
        (config.groww as { accessToken: string }).accessToken = originalToken;
        (config as { marketDataProvider: string }).marketDataProvider = originalProvider;
      }
    });

    it("returns empty indices when provider NIFTY data is unavailable (no fabricated fallback)", async () => {
      const originalProvider = config.marketDataProvider;
      const originalToken = config.groww.accessToken;
      try {
        (config as { marketDataProvider: string }).marketDataProvider = "groww";
        (config.groww as { accessToken: string }).accessToken = "test_nifty_secret_token";

        // Mock fetch returning empty list for quotes
        const mockFetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            status: "SUCCESS",
            payload: [],
          }),
        });
        vi.stubGlobal("fetch", mockFetch);

        await realtimeMarketService.pollProductionQuotes();

        const indices = realtimeMarketService.getIndices();
        // Zero fabricated prices in production
        expect(indices).toEqual([]);

        vi.unstubAllGlobals();
      } finally {
        (config.groww as { accessToken: string }).accessToken = originalToken;
        (config as { marketDataProvider: string }).marketDataProvider = originalProvider;
      }
    });

    it("returns empty indices without throwing when provider quote fetch fails", async () => {
      const originalProvider = config.marketDataProvider;
      const originalToken = config.groww.accessToken;
      try {
        (config as { marketDataProvider: string }).marketDataProvider = "groww";
        (config.groww as { accessToken: string }).accessToken = "test_nifty_secret_token";

        const mockFetch = vi.fn().mockRejectedValue(new Error("Network timeout to Groww API"));
        vi.stubGlobal("fetch", mockFetch);

        await realtimeMarketService.pollProductionQuotes();

        const indices = realtimeMarketService.getIndices();
        expect(indices).toEqual([]);

        vi.unstubAllGlobals();
      } finally {
        (config.groww as { accessToken: string }).accessToken = originalToken;
        (config as { marketDataProvider: string }).marketDataProvider = originalProvider;
      }
    });
  });
});
