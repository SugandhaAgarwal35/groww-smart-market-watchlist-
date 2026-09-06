import type { FastifyInstance } from "fastify";
import { query } from "../../infrastructure/postgres/pool.js";

export async function securitiesRoutes(app: FastifyInstance) {
  // ── Search securities ─────────────────────────────────────
  app.get("/search", async (request) => {
    const { q } = request.query as { q?: string };

    if (!q || q.trim().length === 0) {
      return [];
    }

    const rawQuery = q.trim();
    const upperQuery = rawQuery.toUpperCase();
    const compactQuery = upperQuery.replace(/[\s\-_.]+/g, "");

    const exactMatch = upperQuery;
    const compactMatch = compactQuery;
    const prefixMatch = `${upperQuery}%`;
    const containsMatch = `%${upperQuery}%`;
    const compactContains = `%${compactQuery}%`;

    const result = await query<{
      id: string;
      symbol: string;
      exchange: string;
      name: string;
      sector_name: string | null;
    }>(
      `SELECT s.id, s.symbol, s.exchange, s.name,
              sec.name as sector_name
       FROM securities s
       LEFT JOIN sectors sec ON sec.id = s.sector_id
       WHERE s.active = TRUE
         AND (
           UPPER(s.symbol) = $1
           OR UPPER(s.name) = $1
           OR UPPER(s.symbol) = $2
           OR REPLACE(UPPER(s.name), ' ', '') = $2
           OR UPPER(s.symbol) LIKE $3
           OR UPPER(s.name) LIKE $3
           OR UPPER(s.symbol) LIKE $4
           OR UPPER(s.name) LIKE $4
           OR REPLACE(UPPER(s.name), ' ', '') LIKE $5
           OR REPLACE(UPPER(s.symbol), ' ', '') LIKE $5
         )
       ORDER BY
         CASE
           WHEN UPPER(s.symbol) = $1 OR UPPER(s.symbol) = $2 THEN 0
           WHEN UPPER(s.name) = $1 OR REPLACE(UPPER(s.name), ' ', '') = $2 THEN 1
           WHEN UPPER(s.symbol) LIKE $3 THEN 2
           WHEN UPPER(s.name) LIKE $3 THEN 3
           WHEN UPPER(s.name) LIKE $4 THEN 4
           WHEN UPPER(s.symbol) LIKE $4 THEN 5
           WHEN REPLACE(UPPER(s.name), ' ', '') LIKE $5 THEN 6
           ELSE 7
         END,
         LENGTH(s.symbol) ASC,
         s.symbol ASC
       LIMIT 50`,
      [exactMatch, compactMatch, prefixMatch, containsMatch, compactContains]
    );

    return result.rows.map((r) => ({
      id: r.id,
      symbol: r.symbol,
      exchange: r.exchange,
      name: r.name,
      sectorName: r.sector_name,
    }));
  });

  // ── Get security details ──────────────────────────────────
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const result = await query<{
      id: string;
      symbol: string;
      exchange: string;
      trading_symbol: string;
      name: string;
      sector_name: string | null;
    }>(
      `SELECT s.id, s.symbol, s.exchange, s.trading_symbol, s.name,
              sec.name as sector_name
       FROM securities s
       LEFT JOIN sectors sec ON sec.id = s.sector_id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        error: { code: "SECURITY_NOT_FOUND", message: "Security not found" },
      });
    }

    const row = result.rows[0]!;
    return {
      id: row.id,
      symbol: row.symbol,
      exchange: row.exchange,
      tradingSymbol: row.trading_symbol,
      name: row.name,
      sectorName: row.sector_name,
    };
  });
}
