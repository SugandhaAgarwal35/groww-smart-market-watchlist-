import { v4 as uuid } from "uuid";
import { query, withTransaction } from "../../infrastructure/postgres/pool.js";
import type { MarketSnapshotSummary, MarketSessionStatus } from "@watchlist/contracts";

export interface SnapshotRecord {
  id: string;
  version: number;
  generatedAt: string;
}

export class MarketSnapshotService {
  /**
   * Determine current market session based on IST time.
   * NSE trading hours: 09:15 - 15:30 IST on weekdays.
   */
  public getMarketSessionStatus(): MarketSessionStatus {
    const now = new Date();
    // Convert to IST (UTC + 5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    const day = istDate.getUTCDay(); // 0 = Sun, 6 = Sat
    const hours = istDate.getUTCHours();
    const minutes = istDate.getUTCMinutes();
    const timeMinutes = hours * 60 + minutes;

    // Weekend
    if (day === 0 || day === 6) {
      return "CLOSED";
    }

    // Pre-open: 09:00 - 09:15
    if (timeMinutes >= 9 * 60 && timeMinutes < 9 * 60 + 15) {
      return "PRE_OPEN";
    }

    // Regular trading: 09:15 - 15:30
    if (timeMinutes >= 9 * 60 + 15 && timeMinutes <= 15 * 60 + 30) {
      return "OPEN";
    }

    // Post-close: 15:30 - 16:00
    if (timeMinutes > 15 * 60 + 30 && timeMinutes <= 16 * 60) {
      return "POST_CLOSE";
    }

    return "CLOSED";
  }

  /**
   * Get the latest market snapshot summary.
   */
  public async getLatestSnapshot(): Promise<MarketSnapshotSummary> {
    const res = await query<{
      id: string;
      version: string;
      generated_at: Date;
    }>(
      `SELECT id, version, generated_at
       FROM market_snapshots
       ORDER BY version DESC
       LIMIT 1`
    );

    const session = this.getMarketSessionStatus();

    if (res.rows.length === 0) {
      return {
        snapshotId: null,
        version: null,
        session,
        generatedAt: null,
      };
    }

    const row = res.rows[0]!;
    return {
      snapshotId: row.id,
      version: Number(row.version),
      session,
      generatedAt: row.generated_at.toISOString(),
    };
  }

  /**
   * Create a new coherent snapshot linking observation IDs.
   */
  public async createSnapshot(observationIds: string[]): Promise<SnapshotRecord> {
    return withTransaction(async (client) => {
      // Get next monotonic version
      const verRes = await client.query<{ max_ver: string | null }>(
        `SELECT MAX(version) as max_ver FROM market_snapshots`
      );
      const nextVersion = Number(verRes.rows[0]?.max_ver ?? 0) + 1;
      const snapshotId = uuid();
      const now = new Date();

      await client.query(
        `INSERT INTO market_snapshots (id, version, generated_at)
         VALUES ($1, $2, $3)`,
        [snapshotId, nextVersion, now]
      );

      for (const obsId of observationIds) {
        await client.query(
          `INSERT INTO market_snapshot_observations (snapshot_id, observation_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [snapshotId, obsId]
        );
      }

      return {
        id: snapshotId,
        version: nextVersion,
        generatedAt: now.toISOString(),
      };
    });
  }
}

export const marketSnapshotService = new MarketSnapshotService();
