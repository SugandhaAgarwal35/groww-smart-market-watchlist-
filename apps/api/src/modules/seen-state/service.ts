import { seenStateRepository, type SeenStateRecord } from "./repository.js";
import { query } from "../../infrastructure/postgres/pool.js";

export class SeenStateService {
  public async getSeenStates(
    userId: string,
    watchlistId: string
  ): Promise<Map<string, SeenStateRecord>> {
    return seenStateRepository.getSeenStatesForWatchlist(userId, watchlistId);
  }

  public async markSecuritySeen(params: {
    userId: string;
    watchlistId: string;
    securityId: string;
    observationId: string;
    expectedVersion: number;
  }): Promise<{ success: boolean; newVersion: number; reason?: string }> {
    // 1. Fetch observation details
    const obsRes = await query<{
      price: string;
      observed_at: Date;
    }>(
      `SELECT price, observed_at
       FROM market_observations
       WHERE id = $1 AND security_id = $2`,
      [params.observationId, params.securityId]
    );

    if (obsRes.rows.length === 0) {
      return {
        success: false,
        newVersion: params.expectedVersion,
        reason: "Observation not found for this security",
      };
    }

    const obs = obsRes.rows[0]!;
    const price = parseFloat(obs.price);
    const observedAt = obs.observed_at.toISOString();

    return seenStateRepository.advanceSeenState({
      userId: params.userId,
      watchlistId: params.watchlistId,
      securityId: params.securityId,
      observationId: params.observationId,
      price,
      observedAt,
      expectedVersion: params.expectedVersion,
    });
  }

  public async markAllSeenForWatchlist(params: {
    userId: string;
    watchlistId: string;
    items: Array<{
      securityId: string;
      observationId: string;
      baselineVersion: number;
    }>;
  }): Promise<{ updatedCount: number; errors: string[] }> {
    let updatedCount = 0;
    const errors: string[] = [];

    for (const item of params.items) {
      const result = await this.markSecuritySeen({
        userId: params.userId,
        watchlistId: params.watchlistId,
        securityId: item.securityId,
        observationId: item.observationId,
        expectedVersion: item.baselineVersion,
      });

      if (result.success) {
        updatedCount++;
      } else if (result.reason) {
        errors.push(`${item.securityId}: ${result.reason}`);
      }
    }

    return { updatedCount, errors };
  }
}

export const seenStateService = new SeenStateService();
