import { query } from "../../infrastructure/postgres/pool.js";

export interface BenchmarkContext {
  symbol: string;
  returnPct: number;
  observedAt: string;
}

export interface SectorContext {
  sectorId: string;
  returnPct: number;
  observedAt: string;
}

export class MarketContextService {
  /**
   * Get the primary benchmark return (e.g., NIFTY) for the current snapshot.
   */
  public async getPrimaryBenchmarkReturn(snapshotId?: string | null): Promise<BenchmarkContext | null> {
    try {
      let sql = `SELECT benchmark_symbol, return_pct, observed_at
                 FROM benchmark_observations`;
      const params: unknown[] = [];

      if (snapshotId) {
        sql += ` WHERE snapshot_id = $1`;
        params.push(snapshotId);
      }
      sql += ` ORDER BY observed_at DESC LIMIT 1`;

      const res = await query<{
        benchmark_symbol: string;
        return_pct: string;
        observed_at: Date;
      }>(sql, params);

      if (res.rows.length === 0) {
        // Fallback to most recent benchmark observation across all snapshots
        const fallbackRes = await query<{
          benchmark_symbol: string;
          return_pct: string;
          observed_at: Date;
        }>(
          `SELECT benchmark_symbol, return_pct, observed_at
           FROM benchmark_observations
           ORDER BY observed_at DESC LIMIT 1`
        );

        if (fallbackRes.rows.length === 0) {
          return null;
        }

        const row = fallbackRes.rows[0]!;
        return {
          symbol: row.benchmark_symbol,
          returnPct: parseFloat(row.return_pct),
          observedAt: row.observed_at.toISOString(),
        };
      }

      const row = res.rows[0]!;
      return {
        symbol: row.benchmark_symbol,
        returnPct: parseFloat(row.return_pct),
        observedAt: row.observed_at.toISOString(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Get sector return for a given sector ID.
   */
  public async getSectorReturn(
    sectorId: string | null,
    snapshotId?: string | null
  ): Promise<SectorContext | null> {
    if (!sectorId) return null;

    try {
      let sql = `SELECT sector_id, return_pct, observed_at
                 FROM sector_observations
                 WHERE sector_id = $1`;
      const params: unknown[] = [sectorId];

      if (snapshotId) {
        sql += ` AND snapshot_id = $2`;
        params.push(snapshotId);
      }
      sql += ` ORDER BY observed_at DESC LIMIT 1`;

      const res = await query<{
        sector_id: string;
        return_pct: string;
        observed_at: Date;
      }>(sql, params);

      if (res.rows.length === 0) {
        if (snapshotId) {
          const fbRes = await query<{
            sector_id: string;
            return_pct: string;
            observed_at: Date;
          }>(
            `SELECT sector_id, return_pct, observed_at
             FROM sector_observations
             WHERE sector_id = $1
             ORDER BY observed_at DESC LIMIT 1`,
            [sectorId]
          );
          if (fbRes.rows.length > 0) {
            const fbRow = fbRes.rows[0]!;
            return {
              sectorId: fbRow.sector_id,
              returnPct: parseFloat(fbRow.return_pct),
              observedAt: fbRow.observed_at.toISOString(),
            };
          }
        }
        return null;
      }

      const row = res.rows[0]!;
      return {
        sectorId: row.sector_id,
        returnPct: parseFloat(row.return_pct),
        observedAt: row.observed_at.toISOString(),
      };
    } catch {
      return null;
    }
  }
}

export const marketContextService = new MarketContextService();
