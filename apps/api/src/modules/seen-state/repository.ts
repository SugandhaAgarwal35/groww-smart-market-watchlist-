import { v4 as uuid } from "uuid";
import { query, withTransaction } from "../../infrastructure/postgres/pool.js";

export interface SeenStateRecord {
  id: string;
  userId: string;
  watchlistId: string;
  securityId: string;
  baselineObservationId: string | null;
  baselinePrice: number | null;
  baselineObservedAt: string | null;
  baselineVersion: number;
  seenAt: string | null;
  updatedAt: string;
}

export class SeenStateRepository {
  /**
   * Get seen states for all securities in a watchlist for a user.
   */
  public async getSeenStatesForWatchlist(
    userId: string,
    watchlistId: string
  ): Promise<Map<string, SeenStateRecord>> {
    const res = await query<{
      id: string;
      user_id: string;
      watchlist_id: string;
      security_id: string;
      baseline_observation_id: string | null;
      baseline_price: string | null;
      baseline_observed_at: Date | null;
      baseline_version: string;
      seen_at: Date | null;
      updated_at: Date;
    }>(
      `SELECT id, user_id, watchlist_id, security_id, baseline_observation_id,
              baseline_price, baseline_observed_at, baseline_version, seen_at, updated_at
       FROM seen_states
       WHERE user_id = $1 AND watchlist_id = $2`,
      [userId, watchlistId]
    );

    const map = new Map<string, SeenStateRecord>();
    for (const row of res.rows) {
      map.set(row.security_id, {
        id: row.id,
        userId: row.user_id,
        watchlistId: row.watchlist_id,
        securityId: row.security_id,
        baselineObservationId: row.baseline_observation_id,
        baselinePrice: row.baseline_price ? parseFloat(row.baseline_price) : null,
        baselineObservedAt: row.baseline_observed_at ? row.baseline_observed_at.toISOString() : null,
        baselineVersion: Number(row.baseline_version),
        seenAt: row.seen_at ? row.seen_at.toISOString() : null,
        updatedAt: row.updated_at.toISOString(),
      });
    }

    return map;
  }

  /**
   * Perform atomic conditional seen-state advance.
   * Enforces:
   * 1. baseline_version matches expected baselineVersion (optimistic locking)
   * 2. baseline_observed_at is null or <= new observedAt (never moves backwards)
   */
  public async advanceSeenState(params: {
    userId: string;
    watchlistId: string;
    securityId: string;
    observationId: string;
    price: number;
    observedAt: string;
    expectedVersion: number;
  }): Promise<{ success: boolean; newVersion: number; reason?: string }> {
    return withTransaction(async (client) => {
      // 1. Check if record exists
      const existing = await client.query<{
        id: string;
        baseline_version: string;
        baseline_observed_at: Date | null;
      }>(
        `SELECT id, baseline_version, baseline_observed_at
         FROM seen_states
         WHERE user_id = $1 AND watchlist_id = $2 AND security_id = $3
         FOR UPDATE`,
        [params.userId, params.watchlistId, params.securityId]
      );

      const targetObservedAt = new Date(params.observedAt);

      if (existing.rows.length === 0) {
        // First time initialization
        const newId = uuid();
        await client.query(
          `INSERT INTO seen_states (
             id, user_id, watchlist_id, security_id,
             baseline_observation_id, baseline_price, baseline_observed_at,
             baseline_version, seen_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1, NOW(), NOW())`,
          [
            newId,
            params.userId,
            params.watchlistId,
            params.securityId,
            params.observationId,
            params.price,
            targetObservedAt,
          ]
        );
        return { success: true, newVersion: 1 };
      }

      const row = existing.rows[0]!;
      const currentVer = Number(row.baseline_version);

      if (currentVer !== params.expectedVersion) {
        return {
          success: false,
          newVersion: currentVer,
          reason: `Version conflict: expected ${params.expectedVersion} but current is ${currentVer}`,
        };
      }

      if (row.baseline_observed_at && row.baseline_observed_at > targetObservedAt) {
        return {
          success: false,
          newVersion: currentVer,
          reason: "Cannot move baseline observed_at backwards in time",
        };
      }

      const nextVer = currentVer + 1;
      const updateRes = await client.query(
        `UPDATE seen_states
         SET baseline_observation_id = $1,
             baseline_price = $2,
             baseline_observed_at = $3,
             baseline_version = $4,
             seen_at = NOW(),
             updated_at = NOW()
         WHERE user_id = $5
           AND watchlist_id = $6
           AND security_id = $7
           AND baseline_version = $8`,
        [
          params.observationId,
          params.price,
          targetObservedAt,
          nextVer,
          params.userId,
          params.watchlistId,
          params.securityId,
          params.expectedVersion,
        ]
      );

      if (updateRes.rowCount === 0) {
        return {
          success: false,
          newVersion: currentVer,
          reason: "Stale concurrent update rejected",
        };
      }

      return { success: true, newVersion: nextVer };
    });
  }
}

export const seenStateRepository = new SeenStateRepository();
