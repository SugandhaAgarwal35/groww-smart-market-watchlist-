// ──────────────────────────────────────────────────────────────
// Core Domain Enums
// ──────────────────────────────────────────────────────────────

export type AttentionLevel = "HIGH" | "MEDIUM" | "LOW" | "NONE";

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export type DataQualityStatus =
  | "TRUSTED"
  | "DELAYED"
  | "CONFLICTED"
  | "INVALID";

export type FreshnessStatus = "FRESH" | "DELAYED" | "STALE" | "UNKNOWN";

export type SignalType =
  | "PRICE_CHANGE"
  | "MARKET_RELATIVE"
  | "SECTOR_RELATIVE"
  | "VOLUME_ANOMALY"
  | "HIGH_52W"
  | "LOW_52W"
  | "RANGE_BREAKOUT"
  | "RANGE_BREAKDOWN"
  | "EVENT";

export type SignalStatus = "VALID" | "NOT_AVAILABLE" | "INVALID";

export type MarketSessionStatus =
  | "PRE_OPEN"
  | "OPEN"
  | "POST_CLOSE"
  | "CLOSED"
  | "UNKNOWN";

export type ChangeState = "CHANGED" | "FIRST_VIEW" | "UNCHANGED" | "UNAVAILABLE";

// ──────────────────────────────────────────────────────────────
// Domain Entities
// ──────────────────────────────────────────────────────────────

export interface Security {
  id: string;
  symbol: string;
  exchange: string;
  tradingSymbol: string;
  name: string;
  sectorId: string | null;
  active: boolean;
}

export interface Watchlist {
  id: string;
  userId: string;
  name: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface WatchlistItem {
  id: string;
  watchlistId: string;
  securityId: string;
  position: number;
  addedAt: string;
}

// ──────────────────────────────────────────────────────────────
// Market Data
// ──────────────────────────────────────────────────────────────

export interface NormalizedQuote {
  securityId: string;
  provider: string;
  sourceEventId: string | null;
  price: number;
  volume: number | null;
  dayChange: number | null;
  dayChangePct: number | null;
  openPrice: number | null;
  highPrice: number | null;
  lowPrice: number | null;
  previousClose: number | null;
  week52High: number | null;
  week52Low: number | null;
  observedAt: string;
  qualityStatus: DataQualityStatus;
}

// ──────────────────────────────────────────────────────────────
// Signals & Assessment
// ──────────────────────────────────────────────────────────────

export interface Signal {
  type: SignalType;
  value: number | null;
  unit: string;
  status: SignalStatus;
  contribution: string;
}

export interface ExplanationFact {
  type: string;
  value: string;
  priority: number;
}

// ──────────────────────────────────────────────────────────────
// API Response Types
// ──────────────────────────────────────────────────────────────

export interface WatchlistSummary {
  id: string;
  name: string;
  itemCount: number;
}

export interface MarketSnapshotSummary {
  snapshotId: string | null;
  version: number | null;
  session: MarketSessionStatus;
  generatedAt: string | null;
}

export interface SnapshotItemSecurity {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
}

export interface SnapshotItemMarket {
  price: number | null;
  previousClose: number | null;
  dayChange: number | null;
  dayChangePct: number | null;
  volume: number | null;
  week52High: number | null;
  week52Low: number | null;
  observedAt: string | null;
  freshness: FreshnessStatus;
  observationId: string | null;
}

export interface SnapshotItemChange {
  state: ChangeState;
  attention: AttentionLevel;
  attentionScore: number;
  confidence: ConfidenceLevel;
  confidenceScore: number;
}

export interface SnapshotItemSeen {
  baselineObservedAt: string | null;
  baselinePrice: number | null;
  baselineVersion: number;
  sinceLastCheck: string | null;
}

export interface SnapshotItem {
  security: SnapshotItemSecurity;
  market: SnapshotItemMarket;
  change: SnapshotItemChange;
  signals: Signal[];
  explanation: string[];
  seen: SnapshotItemSeen;
}

export interface ChangeSummary {
  meaningfulChanges: number;
  highAttention: number;
  mediumAttention: number;
  lowAttention: number;
}

export interface WatchlistSnapshotResponse {
  watchlist: WatchlistSummary;
  market: MarketSnapshotSummary;
  summary: ChangeSummary;
  items: SnapshotItem[];
}

// ──────────────────────────────────────────────────────────────
// API Request Types
// ──────────────────────────────────────────────────────────────

export interface CreateWatchlistRequest {
  name: string;
}

export interface RenameWatchlistRequest {
  name: string;
}

export interface AddSecurityRequest {
  securityId: string;
}

export interface ReorderItemsRequest {
  securityIds: string[];
}

export interface MarkSeenRequest {
  observationId: string;
  observedAt: string;
  baselineVersion: number;
}

// ──────────────────────────────────────────────────────────────
// API Error Response
// ──────────────────────────────────────────────────────────────

export interface ApiError {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}

// ──────────────────────────────────────────────────────────────
// Security Search
// ──────────────────────────────────────────────────────────────

export interface SecuritySearchResult {
  id: string;
  symbol: string;
  exchange: string;
  name: string;
  sectorName: string | null;
}

// ──────────────────────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

// ──────────────────────────────────────────────────────────────
// User Preferences
// ──────────────────────────────────────────────────────────────

export type ThemePreference = "light" | "dark" | "system";
export type DisplayDensity = "comfortable" | "compact";

export interface UserPreferences {
  userId: string;
  theme: ThemePreference;
  defaultWatchlistId: string | null;
  displayDensity: DisplayDensity;
  updatedAt: string;
}

export interface UpdateUserPreferencesRequest {
  theme?: ThemePreference;
  defaultWatchlistId?: string | null;
  displayDensity?: DisplayDensity;
}

