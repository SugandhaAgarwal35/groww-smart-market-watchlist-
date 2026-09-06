import { query } from "../../infrastructure/postgres/pool.js";

export interface CorporateActionRecord {
  id: string;
  securityId: string;
  actionType: string;
  effectiveAt: Date;
  adjustmentFactor: number;
  source: string | null;
}

export interface AdjustmentResult {
  adjustedBaselinePrice: number;
  hasAdjustment: boolean;
  actionsApplied: CorporateActionRecord[];
  confidenceDegraded: boolean;
}

export class CorporateActionService {
  /**
   * Adjust baseline price for any corporate actions between baseline timestamp and current observation timestamp.
   */
  public async adjustBaseline(
    securityId: string,
    baselinePrice: number,
    baselineObservedAt: string | Date | null,
    currentObservedAt: string | Date
  ): Promise<AdjustmentResult> {
    if (!baselineObservedAt) {
      return {
        adjustedBaselinePrice: baselinePrice,
        hasAdjustment: false,
        actionsApplied: [],
        confidenceDegraded: false,
      };
    }

    const baselineDate =
      typeof baselineObservedAt === "string"
        ? new Date(baselineObservedAt)
        : baselineObservedAt;
    const currentDate =
      typeof currentObservedAt === "string"
        ? new Date(currentObservedAt)
        : currentObservedAt;

    try {
      const res = await query<{
        id: string;
        security_id: string;
        action_type: string;
        effective_at: Date;
        adjustment_factor: string;
        source: string | null;
      }>(
        `SELECT id, security_id, action_type, effective_at, adjustment_factor, source
         FROM corporate_actions
         WHERE security_id = $1
           AND effective_at > $2
           AND effective_at <= $3
         ORDER BY effective_at ASC`,
        [securityId, baselineDate, currentDate]
      );

      if (res.rows.length === 0) {
        return {
          adjustedBaselinePrice: baselinePrice,
          hasAdjustment: false,
          actionsApplied: [],
          confidenceDegraded: false,
        };
      }

      let adjusted = baselinePrice;
      const actionsApplied: CorporateActionRecord[] = [];

      for (const row of res.rows) {
        const factor = parseFloat(row.adjustment_factor);
        if (Number.isFinite(factor) && factor > 0) {
          adjusted = adjusted * factor;
          actionsApplied.push({
            id: row.id,
            securityId: row.security_id,
            actionType: row.action_type,
            effectiveAt: row.effective_at,
            adjustmentFactor: factor,
            source: row.source,
          });
        }
      }

      return {
        adjustedBaselinePrice: Number(adjusted.toFixed(4)),
        hasAdjustment: actionsApplied.length > 0,
        actionsApplied,
        confidenceDegraded: false,
      };
    } catch {
      // If table query fails, don't crash, but flag degraded confidence
      return {
        adjustedBaselinePrice: baselinePrice,
        hasAdjustment: false,
        actionsApplied: [],
        confidenceDegraded: true,
      };
    }
  }
}

export const corporateActionService = new CorporateActionService();
