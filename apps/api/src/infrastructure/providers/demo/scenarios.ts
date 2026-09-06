export type DemoScenarioName =
  | "NORMAL"
  | "BIG_MOVE"
  | "MARKET_WIDE_DROP"
  | "VOLUME_SPIKE"
  | "DATA_DELAY"
  | "DATA_CONFLICT"
  | "LATE_OBSERVATION"
  | "CORPORATE_ACTION";

export interface DemoScenarioDefinition {
  name: DemoScenarioName;
  description: string;
  expectedAttention: string;
  expectedConfidence: string;
}

export const DEMO_SCENARIOS: Record<DemoScenarioName, DemoScenarioDefinition> = {
  NORMAL: {
    name: "NORMAL",
    description: "Routine market conditions with +/- 0.5% to 1.2% movements and normal volume.",
    expectedAttention: "LOW / NONE",
    expectedConfidence: "HIGH",
  },
  BIG_MOVE: {
    name: "BIG_MOVE",
    description: "INFY plunges -5.1% while NIFTY is down only -1.0%, with 2.4x median volume.",
    expectedAttention: "HIGH",
    expectedConfidence: "HIGH",
  },
  MARKET_WIDE_DROP: {
    name: "MARKET_WIDE_DROP",
    description: "Market-wide panic: NIFTY down -4.8%, all stocks down ~5%. Stock-specific relative move is modest.",
    expectedAttention: "MEDIUM",
    expectedConfidence: "HIGH",
  },
  VOLUME_SPIKE: {
    name: "VOLUME_SPIKE",
    description: "RELIANCE trades at 3.2x normal volume with moderate +1.8% price move.",
    expectedAttention: "MEDIUM",
    expectedConfidence: "HIGH",
  },
  DATA_DELAY: {
    name: "DATA_DELAY",
    description: "Observation timestamps are >15 minutes old (delayed/stale feed).",
    expectedAttention: "LOW",
    expectedConfidence: "LOW",
  },
  DATA_CONFLICT: {
    name: "DATA_CONFLICT",
    description: "Provider conflict where quote data has contradictory prices (+4% mismatch).",
    expectedAttention: "HIGH",
    expectedConfidence: "LOW",
  },
  LATE_OBSERVATION: {
    name: "LATE_OBSERVATION",
    description: "An observation observed earlier arrives late; pipeline preserves chronological order by observed_at.",
    expectedAttention: "NONE",
    expectedConfidence: "HIGH",
  },
  CORPORATE_ACTION: {
    name: "CORPORATE_ACTION",
    description: "TCS executes a 2:1 split. Naive price drops 50%, but adjustment factor 0.5 prevents false alarms.",
    expectedAttention: "LOW",
    expectedConfidence: "HIGH",
  },
};
