import type { FastifyInstance } from "fastify";
import { query } from "../../infrastructure/postgres/pool.js";
import { realtimeMarketService } from "./realtime-market.service.js";

export async function marketRoutes(app: FastifyInstance) {
  // ── 1. Live SSE Market Stream ───────────────────────────
  app.get("/live-stream", async (request, reply) => {
    // Set headers for Server-Sent Events
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    realtimeMarketService.registerClient(reply.raw);

    // Keep connection alive with heartbeat comment every 15s
    const keepAlive = setInterval(() => {
      reply.raw.write(": heartbeat\n\n");
    }, 15000);

    request.raw.on("close", () => {
      clearInterval(keepAlive);
    });

    // Fastify handles reply hijacking when using raw
    await new Promise(() => {});
  });

  // ── 2. Live Market Indices ──────────────────────────────
  app.get("/indices", async () => {
    return {
      indices: realtimeMarketService.getIndices(),
      timestamp: new Date().toISOString(),
    };
  });

  // ── 3. Live Market Movers (Top Gainers, Losers, Most Bought) ──
  app.get("/movers", async () => {
    return {
      ...realtimeMarketService.getMovers(),
      timestamp: new Date().toISOString(),
    };
  });

  // ── 4. Live Market Depth (5-level Order Book) ───────────
  app.get("/depth/:symbol", async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const depth = realtimeMarketService.getMarketDepth(symbol);

    if (!depth) {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: `Market depth not found for symbol ${symbol}`,
        },
      });
    }

    return depth;
  });

  // ── 5. Current Live Quotes ──────────────────────────────
  app.get("/quotes", async () => {
    return {
      quotes: realtimeMarketService.getAllStocks(),
      timestamp: new Date().toISOString(),
    };
  });

  // ── 6. Market Session Status & Mode ─────────────────────
  app.get("/session", async () => {
    return realtimeMarketService.getSessionInfo();
  });

  // ── 7. Real Observation History for Sparkline/Chart ──────
  app.get("/history/:symbol", async (request) => {
    const { symbol } = request.params as { symbol: string };
    const res = await query<{
      price: string;
      volume: string | null;
      day_change: string | null;
      day_change_pct: string | null;
      observed_at: Date;
    }>(
      `SELECT mo.price, mo.volume, mo.day_change, mo.day_change_pct, mo.observed_at
       FROM market_observations mo
       JOIN securities s ON s.id = mo.security_id
       WHERE UPPER(s.symbol) = UPPER($1)
       ORDER BY mo.observed_at DESC
       LIMIT 30`,
      [symbol]
    );

    const points = res.rows.reverse().map((r) => ({
      price: parseFloat(r.price),
      volume: r.volume ? parseFloat(r.volume) : null,
      dayChange: r.day_change ? parseFloat(r.day_change) : null,
      dayChangePct: r.day_change_pct ? parseFloat(r.day_change_pct) : null,
      observedAt: r.observed_at.toISOString(),
    }));

    return {
      symbol: symbol.toUpperCase(),
      points,
      count: points.length,
    };
  });
}

