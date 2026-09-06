import type { SnapshotItem, AttentionLevel, ConfidenceLevel } from "@watchlist/contracts";

const ATTENTION_PRIORITY: Record<AttentionLevel, number> = {
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  NONE: 1,
};

const CONFIDENCE_PRIORITY: Record<ConfidenceLevel, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export function rankSnapshotItems(items: SnapshotItem[]): SnapshotItem[] {
  return [...items].sort((a, b) => {
    // 1. Attention level
    const attnA = ATTENTION_PRIORITY[a.change.attention];
    const attnB = ATTENTION_PRIORITY[b.change.attention];
    if (attnA !== attnB) {
      return attnB - attnA;
    }

    // 2. Attention score
    if (a.change.attentionScore !== b.change.attentionScore) {
      return b.change.attentionScore - a.change.attentionScore;
    }

    // 3. Confidence level (prioritize higher confidence within same attention, but keep high attention above lower attention)
    const confA = CONFIDENCE_PRIORITY[a.change.confidence];
    const confB = CONFIDENCE_PRIORITY[b.change.confidence];
    if (confA !== confB) {
      return confB - confA;
    }

    // 4. Magnitude of day change percentage
    const moveA = Math.abs(a.market.dayChangePct ?? 0);
    const moveB = Math.abs(b.market.dayChangePct ?? 0);
    return moveB - moveA;
  });
}
