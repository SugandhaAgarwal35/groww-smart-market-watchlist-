import { v4 as uuid } from "uuid";
import { query } from "../../infrastructure/postgres/pool.js";
import type {
  WatchlistSnapshotResponse,
  SnapshotItem,
  AttentionLevel,
  ChangeState,
  FreshnessStatus,
  DataQualityStatus,
} from "@watchlist/contracts";
import { calculateSignals } from "../signal-engine/service.js";
import { assessSignificance } from "../significance-engine/service.js";
import { assessConfidence } from "../confidence-engine/service.js";
import { buildExplanation } from "../explanation/service.js";
import { marketSnapshotService } from "../market-data/snapshot.service.js";
import { marketContextService } from "../market-context/service.js";
import { corporateActionService } from "../corporate-actions/service.js";
import { seenStateService } from "../seen-state/service.js";
import { classifyFreshness } from "../market-data/freshness.js";
import { rankSnapshotItems } from "../ranking/service.js";

const DEFAULT_EXPECTED_VOLUMES: Record<string, number> = {
  INFY: 4_500_000,
  RELIANCE: 6_200_000,
  TCS: 2_100_000,
  HDFCBANK: 12_000_000,
  ICICIBANK: 9_000_000,
  SBIN: 14_000_000,
};

interface WatchlistRow {
  id: string;
  name: string;
}

interface ItemRow {
  security_id: string;
  symbol: string;
  name: string;
  exchange: string;
  sector_id: string | null;
  position: number;
}

interface ObservationRow {
  id: string;
  security_id: string;
  price: string;
  volume: string | null;
  day_change: string | null;
  day_change_pct: string | null;
  previous_close: string | null;
  week_52_high: string | null;
  week_52_low: string | null;
  observed_at: Date;
  quality_status: string;
}

export class SnapshotService {
  public async getWatchlistSnapshot(
    userId: string,
    watchlistId: string
  ): Promise<WatchlistSnapshotResponse | null> {
    // 1. Authorize and load watchlist
    const wlRes = await query<WatchlistRow>(
      `SELECT id, name FROM watchlists WHERE id = $1 AND user_id = $2`,
      [watchlistId, userId]
    );
    if (wlRes.rows.length === 0) {
      return null;
    }
    const watchlist = wlRes.rows[0]!;

    // 2. Load watchlist items
    const itemsRes = await query<ItemRow>(
      `SELECT wi.security_id, s.symbol, s.name, s.exchange, s.sector_id, wi.position
       FROM watchlist_items wi
       JOIN securities s ON s.id = wi.security_id
       WHERE wi.watchlist_id = $1
       ORDER BY wi.position ASC`,
      [watchlistId]
    );
    const items = itemsRes.rows;

    // 3. Resolve market snapshot summary
    const marketSummary = await marketSnapshotService.getLatestSnapshot();

    // 4. Load latest trusted observation for each security
    const securityIds = items.map((i) => i.security_id);
    const observationsMap = new Map<string, ObservationRow>();

    if (securityIds.length > 0) {
      const obsRes = await query<ObservationRow>(
        `SELECT DISTINCT ON (security_id)
                id, security_id, price, volume, day_change, day_change_pct,
                previous_close, week_52_high, week_52_low, observed_at, quality_status
         FROM market_observations
         WHERE security_id = ANY($1::uuid[])
         ORDER BY security_id, observed_at DESC`,
        [securityIds]
      );
      for (const row of obsRes.rows) {
        observationsMap.set(row.security_id, row);
      }
    }

    // 4b. Load historical average volumes for accurate anomaly baseline calculation
    const avgVolumeMap = new Map<string, number>();
    if (securityIds.length > 0) {
      try {
        const avgVolRes = await query<{ security_id: string; avg_vol: string }>(
          `SELECT security_id, AVG(volume)::numeric as avg_vol
           FROM market_observations
           WHERE security_id = ANY($1::uuid[]) AND volume IS NOT NULL
           GROUP BY security_id`,
          [securityIds]
        );
        for (const row of avgVolRes.rows) {
          const val = parseFloat(row.avg_vol);
          if (Number.isFinite(val) && val > 0) {
            avgVolumeMap.set(row.security_id, Math.round(val));
          }
        }
      } catch {
        // Fallback gracefully to default expected volumes
      }
    }

    // 5. Load user seen states
    const seenStatesMap = await seenStateService.getSeenStates(userId, watchlistId);

    // 6. Load market context (Benchmark return & sector returns)
    const benchmarkCtx = await marketContextService.getPrimaryBenchmarkReturn(
      marketSummary.snapshotId
    );

    // 7. Process each item
    const snapshotItems: SnapshotItem[] = [];
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let meaningfulCount = 0;

    for (const item of items) {
      const obs = observationsMap.get(item.security_id);
      const seen = seenStatesMap.get(item.security_id);

      // If no observation at all
      if (!obs) {
        snapshotItems.push({
          security: {
            id: item.security_id,
            symbol: item.symbol,
            name: item.name,
            exchange: item.exchange,
          },
          market: {
            price: null,
            previousClose: null,
            dayChange: null,
            dayChangePct: null,
            volume: null,
            week52High: null,
            week52Low: null,
            observedAt: null,
            freshness: "UNKNOWN",
            observationId: null,
          },
          change: {
            state: "UNAVAILABLE",
            attention: "NONE",
            attentionScore: 0,
            confidence: "LOW",
            confidenceScore: 0.1,
          },
          signals: [],
          explanation: ["Market data currently unavailable for this security."],
          seen: {
            baselineObservedAt: seen?.baselineObservedAt ?? null,
            baselinePrice: seen?.baselinePrice ?? null,
            baselineVersion: seen?.baselineVersion ?? 0,
            sinceLastCheck: null,
          },
        });
        continue;
      }

      const freshness: FreshnessStatus = classifyFreshness({
        observedAt: obs.observed_at,
        sessionStatus: marketSummary.session,
      });

      const qualityStatus = (obs.quality_status as DataQualityStatus) || "TRUSTED";

      // Architecture Decision (Option A):
      // When the latest observation for a security fails quality checks and is marked INVALID,
      // it is surfaced honestly as UNAVAILABLE with price nullified and LOW confidence (0.1).
      // We explicitly do NOT fall back to an older observation, because doing so would conceal
      // live feed failures/anomalies and deceive traders into acting on stale prices.
      if (qualityStatus === "INVALID") {
        snapshotItems.push({
          security: {
            id: item.security_id,
            symbol: item.symbol,
            name: item.name,
            exchange: item.exchange,
          },
          market: {
            price: null,
            previousClose: obs.previous_close ? parseFloat(obs.previous_close) : null,
            dayChange: null,
            dayChangePct: null,
            volume: null,
            week52High: obs.week_52_high ? parseFloat(obs.week_52_high) : null,
            week52Low: obs.week_52_low ? parseFloat(obs.week_52_low) : null,
            observedAt: obs.observed_at ? obs.observed_at.toISOString() : null,
            freshness: "UNKNOWN",
            observationId: obs.id,
          },
          change: {
            state: "UNAVAILABLE",
            attention: "NONE",
            attentionScore: 0,
            confidence: "LOW",
            confidenceScore: 0.1,
          },
          signals: [],
          explanation: [
            "Market data observation marked INVALID by data quality verification.",
            "Observation untrusted and excluded from market intelligence.",
          ],
          seen: {
            baselineObservedAt: seen?.baselineObservedAt ?? null,
            baselinePrice: seen?.baselinePrice ?? null,
            baselineVersion: seen?.baselineVersion ?? 0,
            sinceLastCheck: null,
          },
        });
        lowCount++;
        continue;
      }

      const currentPrice = parseFloat(obs.price);
      const currentVolume = obs.volume ? parseFloat(obs.volume) : null;
      const currentObservedAt = obs.observed_at.toISOString();
      const week52High = obs.week_52_high ? parseFloat(obs.week_52_high) : null;
      const week52Low = obs.week_52_low ? parseFloat(obs.week_52_low) : null;
      const previousClose = obs.previous_close ? parseFloat(obs.previous_close) : null;
      const dayChange = obs.day_change ? parseFloat(obs.day_change) : null;
      const dayChangePct = obs.day_change_pct ? parseFloat(obs.day_change_pct) : null;

      // First view state?
      const isFirstView = !seen || seen.baselinePrice === null;

      // Corporate actions adjustment
      let effectiveBaselinePrice = seen?.baselinePrice ?? null;
      let hasCorporateAction = false;
      let actionConfidenceDegraded = false;

      if (!isFirstView && seen?.baselinePrice) {
        const adjustment = await corporateActionService.adjustBaseline(
          item.security_id,
          seen.baselinePrice,
          seen.baselineObservedAt,
          currentObservedAt
        );
        effectiveBaselinePrice = adjustment.adjustedBaselinePrice;
        hasCorporateAction = adjustment.hasAdjustment;
        actionConfidenceDegraded = adjustment.confidenceDegraded;
      }

      // Sector context
      const sectorCtx = await marketContextService.getSectorReturn(
        item.sector_id,
        marketSummary.snapshotId
      );

      // Compute dynamic expected volume using historical observations or baseline profile
      const dbExpectedVol = avgVolumeMap.get(item.security_id);
      const baselineProfileVol = DEFAULT_EXPECTED_VOLUMES[item.symbol];
      const expectedVolume =
        dbExpectedVol ?? baselineProfileVol ?? (currentVolume ? Math.round(currentVolume) : null);

      // Calculate signals (pure engine)
      const signals = calculateSignals({
        currentPrice,
        baselinePrice: isFirstView ? null : effectiveBaselinePrice,
        previousClose,
        benchmarkReturnPct: benchmarkCtx?.returnPct ?? null,
        sectorReturnPct: sectorCtx?.returnPct ?? null,
        currentVolume,
        expectedVolume,
        week52High,
        week52Low,
        corporateActionAdjustmentFactor: null,
      });

      // Assess significance (pure engine)
      const significance = assessSignificance(signals);

      // Assess confidence (pure engine)
      const confidence = assessConfidence({
        qualityStatus,
        freshness,
        hasValidBaseline: !isFirstView,
        hasProviderConflict: qualityStatus === "CONFLICTED",
        hasCorporateActionCoverage: !actionConfidenceDegraded,
        hasBenchmarkContext: benchmarkCtx !== null,
        hasSectorContext: sectorCtx !== null,
        hasVolumeHistory: currentVolume !== null,
      });

      // Explicitly preserve degraded confidence for CONFLICTED observations
      if (qualityStatus === "CONFLICTED") {
        confidence.confidence = "LOW";
        confidence.confidenceScore = Math.min(confidence.confidenceScore, 0.35);
        if (!confidence.reasons.some((r) => r.toLowerCase().includes("conflict"))) {
          confidence.reasons.push("Data conflict between sources");
        }
      }

      // Generate human explanations
      const explanation = buildExplanation(signals, {
        isFirstView,
        marketSession: marketSummary.session,
        freshness,
        confidenceLevel: confidence.confidence,
        confidenceReasons: confidence.reasons,
      });

      if (qualityStatus === "CONFLICTED") {
        explanation.unshift("⚠ Data discrepancy detected across market quote sources; confidence degraded.");
      }

      // Determine ChangeState
      let state: ChangeState = "UNCHANGED";
      if (isFirstView) {
        state = "FIRST_VIEW";
      } else if (significance.attention !== "NONE") {
        state = "CHANGED";
      }

      // Persist change assessment and evidence for auditability (best effort)
      try {
        const assessmentId = uuid();
        await query(
          `INSERT INTO change_assessments (
             id, user_id, watchlist_id, security_id,
             baseline_observation_id, current_observation_id, snapshot_id,
             attention_level, attention_score,
             confidence_level, confidence_score,
             rule_version, created_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
          [
            assessmentId,
            userId,
            watchlistId,
            item.security_id,
            seen?.baselineObservationId ?? null,
            obs.id,
            marketSummary.snapshotId || null,
            significance.attention,
            significance.attentionScore,
            confidence.confidence,
            confidence.confidenceScore,
            "v2.0-top20",
          ]
        );

        for (const sig of signals) {
          if (sig.status === "VALID" && sig.value !== null) {
            await query(
              `INSERT INTO assessment_evidence (
                 id, assessment_id, evidence_type, numeric_value, text_value,
                 source_observation_id, contribution, created_at
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
              [
                uuid(),
                assessmentId,
                sig.type,
                sig.value,
                sig.unit,
                obs.id,
                sig.contribution,
              ]
            );
          }
        }
      } catch {
        // Non-blocking audit write failure
      }

      // Human readable "since last check" summary
      let sinceLastCheck: string | null = null;
      if (!isFirstView && effectiveBaselinePrice !== null) {
        const diff = currentPrice - effectiveBaselinePrice;
        const diffPct = (diff / effectiveBaselinePrice) * 100;
        const sign = diff >= 0 ? "+" : "";
        sinceLastCheck = `${sign}${diffPct.toFixed(2)}% (₹${effectiveBaselinePrice.toFixed(2)} → ₹${currentPrice.toFixed(2)})`;
      }

      // Update counters
      if (significance.attention === "HIGH") highCount++;
      else if (significance.attention === "MEDIUM") mediumCount++;
      else if (significance.attention === "LOW") lowCount++;

      if (significance.attention !== "NONE" && !isFirstView) {
        meaningfulCount++;
      }

      snapshotItems.push({
        security: {
          id: item.security_id,
          symbol: item.symbol,
          name: item.name,
          exchange: item.exchange,
        },
        market: {
          price: currentPrice,
          previousClose,
          dayChange,
          dayChangePct,
          volume: currentVolume,
          week52High,
          week52Low,
          observedAt: currentObservedAt,
          freshness,
          observationId: obs.id,
        },
        change: {
          state,
          attention: significance.attention,
          attentionScore: significance.attentionScore,
          confidence: confidence.confidence,
          confidenceScore: confidence.confidenceScore,
        },
        signals,
        explanation,
        seen: {
          baselineObservedAt: seen?.baselineObservedAt ?? null,
          baselinePrice: seen?.baselinePrice ?? null,
          baselineVersion: seen?.baselineVersion ?? 0,
          sinceLastCheck,
        },
      });
    }

    // Rank items according to attention hierarchy
    const rankedItems = rankSnapshotItems(snapshotItems);

    return {
      watchlist: {
        id: watchlist.id,
        name: watchlist.name,
        itemCount: items.length,
      },
      market: marketSummary,
      summary: {
        meaningfulChanges: meaningfulCount,
        highAttention: highCount,
        mediumAttention: mediumCount,
        lowAttention: lowCount,
      },
      items: rankedItems,
    };
  }
}

export const snapshotService = new SnapshotService();
