# 05 — Implementation Guide
## Smart Market Watchlist — 72-Hour Build

**Version:** 1.0  
**Status:** Implementation-ready specification  
**Primary rule:** Follow this document before changing architecture or writing shortcuts.

---

# 0. Purpose of This Document

This document converts:

- `01_PRD.md`
- `02_SRS.md`
- `03_System_Architecture_v2_Top20.md`
- `04_UML_Diagrams.md`

into an implementation plan.

This is the document where implementation mistakes are most likely to happen,
so the design below deliberately specifies:

- exact stack,
- exact module boundaries,
- database schema,
- API contracts,
- data types,
- state transitions,
- algorithms,
- validation rules,
- concurrency behavior,
- provider abstraction,
- frontend structure,
- testing,
- demo data,
- deployment,
- 72-hour sequence,
- and a final verification checklist.

**Do not start by coding random screens.**

The implementation order is:

```text
Database
   ↓
Domain types
   ↓
Market-data adapter
   ↓
Ingestion + trusted state
   ↓
Signal engine
   ↓
Significance + confidence
   ↓
Seen-state
   ↓
API
   ↓
Frontend
   ↓
Demo scenarios
   ↓
Testing
```

---

# 1. Non-Negotiable Architecture

## 1.1 Selected stack

| Layer | Technology | Decision |
|---|---|---|
| Frontend | React + TypeScript + Vite | Use |
| Backend | Node.js + TypeScript + Fastify | Use |
| Database | PostgreSQL | Use |
| Cache | Redis | Optional initially |
| Validation | Zod | Use at boundaries |
| DB access | `pg` | Use |
| HTTP client | native `fetch` / `undici` | Use |
| Testing | Vitest | Use |
| Browser E2E | Playwright | Use if time permits |
| Styling | Tailwind CSS or simple CSS modules | Keep simple |
| Package manager | npm | Use |
| Runtime | Node.js LTS | Use |

Fastify has current TypeScript support and documented PostgreSQL integration,
which fits the selected modular-monolith approach. citeturn0search2turn0search5

## 1.2 Why not add more infrastructure?

Do NOT add:

```text
Kafka
RabbitMQ
Kubernetes
microservices
GraphQL
Elasticsearch
event sourcing
ML model
LLM decision-maker
```

unless an actual requirement appears that cannot be solved without them.

The 72-hour constraint makes correctness more valuable than infrastructure
theater.

---

# 2. Repository Structure

Use a single repository.

```text
smart-market-watchlist/
│
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   │   ├── watchlist/
│   │   │   │   ├── market/
│   │   │   │   ├── changes/
│   │   │   │   └── seen-state/
│   │   │   ├── lib/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   ├── types/
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── api/
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── users/
│       │   │   ├── securities/
│       │   │   ├── watchlists/
│       │   │   ├── market-data/
│       │   │   ├── market-state/
│       │   │   ├── market-context/
│       │   │   ├── seen-state/
│       │   │   ├── signal-engine/
│       │   │   ├── significance-engine/
│       │   │   ├── confidence-engine/
│       │   │   ├── corporate-actions/
│       │   │   ├── data-quality/
│       │   │   ├── explanation/
│       │   │   └── ranking/
│       │   │
│       │   ├── workers/
│       │   │   ├── market-ingestion.worker.ts
│       │   │   └── event-ingestion.worker.ts
│       │   │
│       │   ├── infrastructure/
│       │   │   ├── postgres/
│       │   │   ├── redis/
│       │   │   └── providers/
│       │   │       ├── groww/
│       │   │       └── demo/
│       │   │
│       │   ├── config/
│       │   ├── shared/
│       │   │   ├── errors/
│       │   │   ├── types/
│       │   │   └── utils/
│       │   ├── app.ts
│       │   └── server.ts
│       │
│       ├── migrations/
│       ├── seeds/
│       ├── tests/
│       └── package.json
│
├── packages/
│   └── contracts/
│       └── src/
│
├── docs/
│   ├── 01_PRD.md
│   ├── 02_SRS.md
│   ├── 03_System_Architecture.md
│   ├── 04_UML_Diagrams.md
│   └── 05_Implementation_Guide.md
│
├── docker-compose.yml
├── package.json
├── README.md
└── .env.example
```

---

# 3. Backend Module Rules

Each module should contain:

```text
module/
├── domain/
├── application/
├── infrastructure/
├── routes/
└── index.ts
```

For a small module, this can be simplified to:

```text
module/
├── service.ts
├── repository.ts
├── schema.ts
├── routes.ts
└── types.ts
```

Do not create 50 files for trivial CRUD.

## Dependency rule

```text
Routes
  ↓
Application/service
  ↓
Domain logic
  ↓
Repository/interface
  ↓
Infrastructure
```

Never:

```text
Route
  ↓
raw SQL + scoring + provider HTTP + response formatting
```

---

# 4. Environment Configuration

Create:

```text
.env.example
```

with:

```env
NODE_ENV=development

PORT=3000
WEB_ORIGIN=http://localhost:5173

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/watchlist

REDIS_URL=redis://localhost:6379

MARKET_DATA_PROVIDER=demo

GROWW_API_BASE_URL=https://api.groww.in
GROWW_ACCESS_TOKEN=

MARKET_REFRESH_INTERVAL_SECONDS=30

SIGNIFICANCE_RULE_VERSION=v1
```

### Important

Never commit:

```text
GROWW_ACCESS_TOKEN
DATABASE_PASSWORD
JWT_SECRET
```

to Git.

---

# 5. PostgreSQL Schema

PostgreSQL is the durable source of truth.

Use `UUID` for entity IDs.

Use:

```text
timestamptz
```

for timestamps.

Use:

```text
numeric
```

for financial values rather than floating-point database columns.

---

# 6. Database Tables

## 6.1 users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

For the challenge, authentication can be intentionally minimal.

---

## 6.2 securities

```sql
CREATE TABLE securities (
    id UUID PRIMARY KEY,
    symbol TEXT NOT NULL,
    exchange TEXT NOT NULL,
    trading_symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    sector_id UUID,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_security_exchange_symbol
        UNIQUE (exchange, trading_symbol)
);
```

Add an index:

```sql
CREATE INDEX idx_securities_symbol
ON securities(symbol);
```

---

## 6.3 sectors

```sql
CREATE TABLE sectors (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);
```

---

## 6.4 watchlists

```sql
CREATE TABLE watchlists (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_watchlists_user
ON watchlists(user_id);
```

---

## 6.5 watchlist_items

```sql
CREATE TABLE watchlist_items (
    id UUID PRIMARY KEY,
    watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    security_id UUID NOT NULL REFERENCES securities(id),
    position INTEGER NOT NULL,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_watchlist_security
        UNIQUE (watchlist_id, security_id)
);

CREATE INDEX idx_watchlist_items_watchlist
ON watchlist_items(watchlist_id, position);
```

---

# 7. Market Observation Schema

This table is central.

```sql
CREATE TABLE market_observations (
    id UUID PRIMARY KEY,

    security_id UUID NOT NULL REFERENCES securities(id),

    provider TEXT NOT NULL,
    source_event_id TEXT,

    price NUMERIC(20,8) NOT NULL,
    volume NUMERIC(30,4),

    day_change NUMERIC(20,8),
    day_change_pct NUMERIC(20,8),

    open_price NUMERIC(20,8),
    high_price NUMERIC(20,8),
    low_price NUMERIC(20,8),
    previous_close NUMERIC(20,8),

    week_52_high NUMERIC(20,8),
    week_52_low NUMERIC(20,8),

    observed_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    quality_status TEXT NOT NULL,

    raw_payload JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Indexes:

```sql
CREATE INDEX idx_market_obs_security_observed
ON market_observations(security_id, observed_at DESC);

CREATE INDEX idx_market_obs_provider_event
ON market_observations(provider, source_event_id);
```

---

# 8. Why `observed_at` and `received_at` Both Exist

Never use only one timestamp.

Example:

```text
Provider observation:
10:00:05

Our server receives it:
10:00:08

observed_at  = 10:00:05
received_at  = 10:00:08
```

If a 10:00:04 observation arrives after the 10:00:05 observation:

```text
10:00:05 remains latest
```

This prevents packet arrival order from corrupting market state.

---

# 9. Market Snapshot

```sql
CREATE TABLE market_snapshots (
    id UUID PRIMARY KEY,
    version BIGINT NOT NULL UNIQUE,
    market_session_id UUID,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Create:

```sql
CREATE TABLE market_snapshot_observations (
    snapshot_id UUID NOT NULL REFERENCES market_snapshots(id) ON DELETE CASCADE,
    observation_id UUID NOT NULL REFERENCES market_observations(id),
    PRIMARY KEY (snapshot_id, observation_id)
);
```

This allows a watchlist response to reference one coherent snapshot version.

---

# 10. Benchmark and Sector Context

## Benchmark

```sql
CREATE TABLE benchmark_observations (
    id UUID PRIMARY KEY,
    benchmark_symbol TEXT NOT NULL,
    return_pct NUMERIC(20,8) NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    snapshot_id UUID REFERENCES market_snapshots(id)
);
```

## Sector

```sql
CREATE TABLE sector_observations (
    id UUID PRIMARY KEY,
    sector_id UUID NOT NULL REFERENCES sectors(id),
    return_pct NUMERIC(20,8) NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    snapshot_id UUID REFERENCES market_snapshots(id)
);
```

---

# 11. Seen-State Schema

This is one of the most important tables.

```sql
CREATE TABLE seen_states (
    id UUID PRIMARY KEY,

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    security_id UUID NOT NULL REFERENCES securities(id),

    baseline_observation_id UUID
        REFERENCES market_observations(id),

    baseline_price NUMERIC(20,8),
    baseline_observed_at TIMESTAMPTZ,
    baseline_market_session_id UUID,

    baseline_version BIGINT NOT NULL DEFAULT 0,

    seen_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_seen_state
        UNIQUE (user_id, watchlist_id, security_id)
);
```

Index:

```sql
CREATE INDEX idx_seen_states_user_watchlist
ON seen_states(user_id, watchlist_id);
```

---

# 12. Corporate Actions

```sql
CREATE TABLE corporate_actions (
    id UUID PRIMARY KEY,

    security_id UUID NOT NULL REFERENCES securities(id),

    action_type TEXT NOT NULL,

    effective_at TIMESTAMPTZ NOT NULL,

    adjustment_factor NUMERIC(20,8),

    source TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_corporate_actions_security_time
ON corporate_actions(security_id, effective_at);
```

MVP action types:

```text
SPLIT
BONUS
```

Do not pretend to support every corporate action type if the data is not
available.

---

# 13. Change Assessments

Persisting assessments is useful for debugging and reproducibility.

```sql
CREATE TABLE change_assessments (
    id UUID PRIMARY KEY,

    user_id UUID NOT NULL REFERENCES users(id),
    watchlist_id UUID NOT NULL REFERENCES watchlists(id),
    security_id UUID NOT NULL REFERENCES securities(id),

    baseline_observation_id UUID
        REFERENCES market_observations(id),

    current_observation_id UUID NOT NULL
        REFERENCES market_observations(id),

    snapshot_id UUID REFERENCES market_snapshots(id),

    attention_level TEXT NOT NULL,
    attention_score NUMERIC(10,4) NOT NULL,

    confidence_level TEXT NOT NULL,
    confidence_score NUMERIC(10,4) NOT NULL,

    rule_version TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

# 14. Evidence

```sql
CREATE TABLE assessment_evidence (
    id UUID PRIMARY KEY,

    assessment_id UUID NOT NULL
        REFERENCES change_assessments(id) ON DELETE CASCADE,

    evidence_type TEXT NOT NULL,

    numeric_value NUMERIC(20,8),
    text_value TEXT,

    source_observation_id UUID
        REFERENCES market_observations(id),

    contribution TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

This allows the UI/debugger to answer:

```text
Why did this become HIGH?
```

without reconstructing everything from scratch.

---

# 15. Data Quality

You can initially keep quality fields on observations and derive confidence
rather than creating an excessive number of tables.

Required statuses:

```text
TRUSTED
DELAYED
CONFLICTED
INVALID
```

Freshness:

```text
FRESH
DELAYED
STALE
UNKNOWN
```

---

# 16. Database Constraints That Must Not Be Broken

## Rule 1

A watchlist cannot contain the same security twice.

```text
UNIQUE(watchlist_id, security_id)
```

## Rule 2

Seen-state is unique per:

```text
user + watchlist + security
```

## Rule 3

Baseline timestamp cannot move backwards.

Enforce this in application transaction logic.

## Rule 4

Observation ordering uses:

```text
observed_at
```

not:

```text
created_at
received_at
```

## Rule 5

Financial values use decimal/numeric arithmetic.

Do not compare money using JavaScript binary floating point when precision
matters.

---

# 17. TypeScript Domain Types

Create shared enums.

```ts
export type AttentionLevel =
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "NONE";

export type ConfidenceLevel =
  | "HIGH"
  | "MEDIUM"
  | "LOW";

export type DataQualityStatus =
  | "TRUSTED"
  | "DELAYED"
  | "CONFLICTED"
  | "INVALID";

export type SignalStatus =
  | "VALID"
  | "NOT_AVAILABLE"
  | "INVALID";

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
```

---

# 18. Provider Abstraction

Never let the rest of the code directly depend on Groww's response shape.

Define:

```ts
export interface MarketDataProvider {
  getQuotes(
    instruments: ProviderInstrument[]
  ): Promise<RawMarketObservation[]>;
}
```

Provider-specific code:

```text
infrastructure/providers/groww/
├── groww.client.ts
├── groww.mapper.ts
└── groww.provider.ts
```

Demo:

```text
infrastructure/providers/demo/
├── demo.provider.ts
└── scenarios.ts
```

---

# 19. Groww Provider Mapping

Groww's current public API documents:

- quote data,
- LTP,
- OHLC,
- volume,
- last trade time,
- 52-week high/low,
- and related market fields.

The LTP endpoint supports up to 50 instruments per request. citeturn0news20

The architecture should therefore batch instruments rather than making one
HTTP request per watchlist item.

Conceptual mapping:

```text
Groww last_price
    ↓
MarketObservation.price

Groww volume
    ↓
MarketObservation.volume

Groww last_trade_time
    ↓
MarketObservation.observed_at

Groww week_52_high
    ↓
MarketObservation.week52High

Groww week_52_low
    ↓
MarketObservation.week52Low
```

### Important

Do not assume that API credentials, quotas, or pricing are suitable for
production deployment merely because the endpoint is documented. Keep the
provider behind an adapter and use the demo provider for deterministic judging.

Groww publicly describes its APIs as providing live market data and other
trading/data capabilities. citeturn0news1

---

# 20. Raw → Normalized → Trusted Pipeline

Never skip these stages.

```text
Provider Response
       ↓
Raw DTO
       ↓
Validation
       ↓
Normalization
       ↓
Data Quality
       ↓
Corporate Action Context
       ↓
Trusted Observation
```

## Raw DTO

Provider-specific.

## Normalized Observation

Provider-independent.

## Trusted Observation

Eligible to drive product decisions.

---

# 21. Provider Validation

Before accepting an observation:

```text
security exists?
price present?
price > 0?
observedAt present?
observedAt reasonable?
provider response successful?
```

If any critical field fails:

```text
quality = INVALID
```

Do not calculate a normal change assessment from invalid data.

---

# 22. Freshness Rules

Use configuration rather than scattering numbers through the code.

For MVP:

```ts
const freshnessConfig = {
  freshMaxSeconds: 60,
  delayedMaxSeconds: 300,
  staleAfterSeconds: 900,
};
```

Classification:

```text
age <= 60 sec
    → FRESH

60 < age <= 300 sec
    → DELAYED

300 < age <= 900 sec
    → STALE

age > 900 sec
    → STALE
```

### Market-closed exception

Do not call overnight market data "stale" simply because no trades are
occurring.

Use:

```text
market_session = CLOSED
```

and explain:

```text
"Market closed — latest traded price from the previous session."
```

---

# 23. Market Session

Create:

```ts
type MarketSessionStatus =
  | "PRE_OPEN"
  | "OPEN"
  | "POST_CLOSE"
  | "CLOSED"
  | "UNKNOWN";
```

Do not hard-code a naive:

```text
if hour >= 9 && hour <= 15
```

as the only market-session implementation.

Keep session determination behind:

```ts
MarketSessionService
```

so exchange holidays and future improvements can be added without changing
signal logic.

---

# 24. Current Trusted Observation

Implement:

```ts
async function getLatestTrustedObservation(
  securityId: string
): Promise<MarketObservation | null>
```

SQL concept:

```sql
SELECT *
FROM market_observations
WHERE security_id = $1
  AND quality_status = 'TRUSTED'
ORDER BY observed_at DESC
LIMIT 1;
```

Do not order by `created_at`.

---

# 25. Observation Deduplication

If provider gives:

```text
provider = groww
source_event_id = X
```

and the same event is retried:

```text
Do not create a second effective observation.
```

If `source_event_id` is not available, use a deterministic deduplication key
based on:

```text
provider
security
observed_at
price
```

Do not use price alone.

---

# 26. Market Snapshot Generation

The worker should create a snapshot after processing a coherent batch.

Conceptually:

```ts
const snapshot = await createMarketSnapshot({
  observations,
  generatedAt: now,
});
```

Snapshot version must monotonically increase.

Example:

```text
snapshot 100
snapshot 101
snapshot 102
```

Never generate:

```text
102 → 101
```

---

# 27. Signal Engine

Create a pure service:

```ts
interface SignalEngine {
  calculateSignals(input: SignalInput): SignalResult[];
}
```

The engine should not:

- access PostgreSQL,
- call HTTP,
- modify user state,
- generate UI strings.

It should only calculate signals from supplied inputs.

This makes it easy to test.

---

# 28. Price Change Calculation

Use decimal-safe arithmetic.

Conceptually:

```text
changePct =
    ((current - baseline) / baseline) * 100
```

Validation:

```text
baseline > 0
current >= 0
```

If baseline is missing:

```text
status = NOT_AVAILABLE
```

---

# 29. Market-Relative Calculation

```text
securityReturn =
    ((securityCurrent - securityReference)
     / securityReference) * 100

relativeMove =
    securityReturn - benchmarkReturn
```

The exact reference must be explicitly defined.

Do not accidentally compare:

```text
stock since user's last check
```

against:

```text
benchmark today's return
```

unless the time windows match.

---

# 30. Sector-Relative Calculation

Same rule:

```text
sectorRelative =
    securityReturn - sectorReturn
```

Only calculate if:

```text
sectorReturn exists
AND
time window matches
```

Otherwise:

```text
NOT_AVAILABLE
```

---

# 31. Volume Anomaly

Use:

```text
volumeRatio =
    currentVolume / expectedVolume
```

For MVP:

```text
expectedVolume =
    median comparable historical volume
```

If there is insufficient history:

```text
NOT_AVAILABLE
```

Do not use:

```text
currentVolume > 1,000,000
```

as a universal anomaly rule.

Different securities have radically different normal volumes.

---

# 32. Significant Level Detection

Check:

```text
current >= 52-week high
```

or:

```text
current <= 52-week low
```

Use an epsilon where appropriate to avoid floating precision edge cases.

Example:

```text
if currentPrice >= high52Week:
    HIGH_52W
```

Do not claim a new high if the market data itself is stale or invalid.

---

# 33. Corporate-Action Adjustment

Before comparing a baseline against current price:

```text
actions =
    getActionsBetween(
        securityId,
        baselineObservedAt,
        currentObservedAt
    )
```

If no actions:

```text
adjustedBaseline = baselinePrice
```

If a supported split/bonus action exists:

```text
adjustedBaseline =
    applyAdjustment(baselinePrice, actions)
```

If adjustment cannot be confidently determined:

```text
comparisonStatus = DEGRADED
confidence = LOW
```

Do not fabricate an adjustment.

---

# 34. Significance Rules

Do not start with an opaque ML model.

Create deterministic rules.

Example configuration:

```ts
const thresholds = {
  priceMove: {
    high: 5,
    medium: 2,
  },

  marketRelative: {
    high: 3,
    medium: 1.5,
  },

  volumeRatio: {
    high: 2.5,
    medium: 1.5,
  },
};
```

These are initial engineering thresholds, not claims about universal market
truth.

Keep them configurable.

---

# 35. Evidence-First Assessment

Do not implement:

```ts
score =
  price * 0.4 +
  volume * 0.2 +
  ...
```

and then hide the evidence.

Instead:

```ts
const evidence = [
  priceEvidence,
  marketRelativeEvidence,
  sectorEvidence,
  volumeEvidence,
  levelEvidence,
];
```

Then:

```ts
const attention =
  significancePolicy.evaluate(evidence);
```

The output should preserve each contribution.

---

# 36. Example Significance Policy

A practical MVP policy:

```text
HIGH if:
  strong price move
  AND/OR strong market-relative move
  AND evidence is not invalid

MEDIUM if:
  moderate price/context movement
  OR strong volume anomaly
  OR significant level

LOW if:
  small but non-zero meaningful movement

NONE if:
  no meaningful signal
```

Then apply context.

Example:

```text
Stock: -5%
Market: -4.5%

Raw stock move: HIGH
Relative move: LOW

Final attention:
MEDIUM
```

This prevents a market-wide crash from making every stock look exceptional.

---

# 37. Attention and Confidence

Implement separately:

```ts
interface Assessment {
  attention: {
    level: AttentionLevel;
    score: number;
  };

  confidence: {
    level: ConfidenceLevel;
    score: number;
  };
}
```

Never derive:

```text
confidence = attention
```

---

# 38. Confidence Rules

Start with deterministic checks.

### HIGH confidence

All critical inputs valid:

```text
trusted observation
fresh timestamp
valid baseline
no provider conflict
valid market context
corporate-action state known
```

### MEDIUM confidence

Some non-critical context missing:

```text
sector unavailable
historical volume unavailable
```

but core price data remains trusted.

### LOW confidence

Any critical integrity issue:

```text
provider conflict
stale observation
uncertain corporate action
invalid baseline
timestamp problem
```

---

# 39. Explanation Facts

Create structured facts:

```ts
type ExplanationFact = {
  type:
    | "PRICE_CHANGE"
    | "MARKET_RELATIVE"
    | "SECTOR_RELATIVE"
    | "VOLUME_ANOMALY"
    | "LEVEL"
    | "DATA_QUALITY";

  value: number | string;
  priority: number;
};
```

Then render.

Example:

```text
INFY is down 5.1% since your last check.
It is underperforming the benchmark by 3.9 percentage points.
Volume is 2.3× its recent baseline.
```

---

# 40. Explanation Safety Rule

Never produce:

```text
"INFY fell because investors are worried about AI."
```

unless an actual validated event source says so.

The system can safely say:

```text
"INFY is down 5.1% since your last check."
```

and:

```text
"INFY is underperforming the benchmark by 3.9 pp."
```

This keeps explanations factual.

---

# 41. Optional LLM Integration

If time remains, an LLM can turn structured facts into polished language.

Architecture:

```text
Validated Evidence
       ↓
LLM
       ↓
Text only
```

The LLM must NOT:

```text
choose attention
invent market causes
modify numbers
decide confidence
```

For the first implementation, skip the LLM entirely.

A deterministic explanation is safer for the competition demo.

---

# 42. Seen-State Semantics

This is critical.

The client flow should be:

```text
GET snapshot
   ↓
render trustworthy card
   ↓
client confirms visible state
   ↓
POST seen event
```

Do not mark seen when the GET starts.

---

# 43. Seen Endpoint

Recommended:

```http
POST /api/v1/watchlists/:watchlistId/items/:securityId/seen
```

Request:

```json
{
  "observationId": "uuid",
  "observedAt": "2026-09-04T09:45:00Z",
  "baselineVersion": 7
}
```

---

# 44. Atomic Seen-State Update

Use a PostgreSQL transaction.

Conceptual SQL:

```sql
UPDATE seen_states
SET
    baseline_observation_id = $1,
    baseline_price = $2,
    baseline_observed_at = $3,
    baseline_market_session_id = $4,
    baseline_version = baseline_version + 1,
    seen_at = NOW(),
    updated_at = NOW()
WHERE user_id = $5
  AND watchlist_id = $6
  AND security_id = $7
  AND baseline_version = $8
  AND (
      baseline_observed_at IS NULL
      OR baseline_observed_at <= $3
  );
```

Then:

```text
rowsUpdated = 1
    → success

rowsUpdated = 0
    → stale/conflicting transition
```

This handles concurrent devices.

---

# 45. Seen-State Example

Initial:

```text
baseline = O10
version = 7
```

Device A:

```text
O11, version 7
```

Device B:

```text
O12, version 7
```

Suppose B wins first:

```text
baseline = O12
version = 8
```

A arrives:

```text
version 7 ≠ current version 8
```

A fails.

Correct.

The older request cannot overwrite the newer baseline.

---

# 46. First-Time User

If:

```text
SeenState does not exist
```

do not pretend a change happened.

Return:

```text
state = FIRST_VIEW
```

The UI can show:

```text
"Start tracking changes from here."
```

After the user views the card, create the baseline.

---

# 47. Watchlist APIs

Use versioned APIs:

```text
/api/v1
```

## Create watchlist

```http
POST /api/v1/watchlists
```

Request:

```json
{
  "name": "My Watchlist"
}
```

Response:

```json
{
  "id": "uuid",
  "name": "My Watchlist"
}
```

---

## List watchlists

```http
GET /api/v1/watchlists
```

---

## Rename

```http
PATCH /api/v1/watchlists/:id
```

Request:

```json
{
  "name": "Long Term"
}
```

---

## Delete

```http
DELETE /api/v1/watchlists/:id
```

---

# 48. Watchlist Security APIs

## Search securities

```http
GET /api/v1/securities/search?q=infy
```

Return:

```json
[
  {
    "id": "uuid",
    "symbol": "INFY",
    "exchange": "NSE",
    "name": "Infosys Limited"
  }
]
```

---

## Add security

```http
POST /api/v1/watchlists/:id/items
```

Request:

```json
{
  "securityId": "uuid"
}
```

---

## Remove security

```http
DELETE /api/v1/watchlists/:id/items/:securityId
```

---

## Reorder

```http
PATCH /api/v1/watchlists/:id/items/reorder
```

Request:

```json
{
  "securityIds": [
    "uuid-1",
    "uuid-2",
    "uuid-3"
  ]
}
```

Validate:

```text
all belong to this watchlist
no duplicates
```

---

# 49. Main Snapshot API

The most important endpoint:

```http
GET /api/v1/watchlists/:id/snapshot
```

Response:

```json
{
  "watchlist": {
    "id": "uuid",
    "name": "My Watchlist"
  },

  "market": {
    "snapshotId": "uuid",
    "version": 1042,
    "session": "OPEN",
    "generatedAt": "2026-09-04T09:45:20Z"
  },

  "items": [
    {
      "security": {
        "id": "uuid",
        "symbol": "INFY",
        "name": "Infosys Limited"
      },

      "market": {
        "price": 1495.2,
        "observedAt": "2026-09-04T09:45:18Z",
        "freshness": "FRESH"
      },

      "change": {
        "state": "CHANGED",
        "attention": "HIGH",
        "attentionScore": 8.4,
        "confidence": "HIGH",
        "confidenceScore": 0.96
      },

      "signals": [
        {
          "type": "PRICE_CHANGE",
          "value": -5.1,
          "unit": "PERCENT"
        },
        {
          "type": "MARKET_RELATIVE",
          "value": -3.9,
          "unit": "PERCENTAGE_POINTS"
        }
      ],

      "explanation": [
        "Down 5.1% since your last check",
        "Underperforming the benchmark by 3.9 pp"
      ],

      "seen": {
        "baselineObservedAt": "2026-09-04T08:30:00Z"
      }
    }
  ]
}
```

---

# 50. Snapshot API Execution Order

Implement the service in this exact conceptual order:

```text
1. authenticate user
2. authorize watchlist
3. load watchlist items
4. resolve current market snapshot
5. load trusted observations
6. load user seen states
7. load market/sector context
8. calculate/load signals
9. calculate significance
10. calculate confidence
11. build explanation facts
12. rank results
13. return coherent response
```

Do not update SeenState during this request.

---

# 51. Ranking

Ranking should prioritize:

```text
1. attention level
2. attention score
3. confidence
4. magnitude of meaningful relative move
```

But do not bury low-confidence HIGH-attention events.

Example UI:

```text
HIGH ATTENTION
LOW CONFIDENCE
```

is preferable to silently ranking the event as trustworthy.

---

# 52. Suggested Response Ordering

```text
HIGH + HIGH confidence
HIGH + MEDIUM
HIGH + LOW

MEDIUM + HIGH
MEDIUM + MEDIUM
MEDIUM + LOW

LOW
NONE
```

This is a presentation policy, not a trading recommendation.

---

# 53. Error Model

Use a consistent error format:

```json
{
  "error": {
    "code": "WATCHLIST_NOT_FOUND",
    "message": "Watchlist not found",
    "requestId": "uuid"
  }
}
```

Common codes:

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
WATCHLIST_NOT_FOUND
SECURITY_NOT_FOUND
DUPLICATE_SECURITY
INVALID_OBSERVATION
STALE_SEEN_UPDATE
MARKET_DATA_UNAVAILABLE
INTERNAL_ERROR
```

Never return stack traces to the browser.

---

# 54. Retry Strategy

For provider calls:

```text
attempt 1
  ↓ failure
short backoff
  ↓
attempt 2
  ↓ failure
longer backoff
  ↓
attempt 3
  ↓ failure
mark provider unavailable
```

Keep retries bounded.

Do not retry indefinitely.

For the challenge:

```text
max attempts = 3
```

is sufficient.

---

# 55. Circuit Breaker

If implementing one, keep it simple:

```text
CLOSED
  ↓ repeated failures
OPEN
  ↓ timeout
HALF_OPEN
  ↓ success
CLOSED
```

If time is short, a bounded retry + stale-state fallback is more important
than a sophisticated circuit breaker.

---

# 56. Stale Market Data Behavior

If provider fails but the last trusted observation exists:

```text
return last trusted data
+
freshness = STALE
+
confidence <= LOW
```

Never return:

```text
freshness = FRESH
```

when the source is unavailable.

---

# 57. Conflicting Providers

If two providers disagree materially:

```text
store both
mark conflict
do not silently average
```

For MVP:

```text
effective quality = CONFLICTED
confidence = LOW
```

You can later implement provider precedence.

---

# 58. Redis Usage

Redis is optional.

Use it for:

```text
latest market snapshot
short-lived market data cache
rate limiting
```

Do not put:

```text
SeenState
watchlist membership
baseline
```

only in Redis.

PostgreSQL owns those.

If Redis disappears:

```text
system must continue using PostgreSQL
```

---

# 59. Frontend Pages

Only build the pages that matter.

```text
/
  redirect to /watchlists

/watchlists
  list watchlists

/watchlists/:id
  main intelligent watchlist

/watchlists/:id/manage
  add/remove/reorder securities
```

Do not build:

```text
profile settings
broker account
order placement
portfolio
full stock terminal
```

unless time remains after MVP.

---

# 60. Main Watchlist UI

The main page should communicate:

```text
WHAT CHANGED?
WHAT MATTERS?
HOW CONFIDENT ARE WE?
WHY?
```

Recommended card:

```text
┌────────────────────────────────────────────┐
│ INFY                              HIGH      │
│ Infosys                                      │
│                                              │
│ ₹1,495.20       -5.1%                       │
│                                              │
│ ↓ 5.1% since you last checked              │
│ ↓ 3.9 pp vs benchmark                      │
│ Volume 2.3× recent baseline                │
│                                              │
│ ● High confidence                           │
│                                              │
│ [Mark as seen]                              │
└────────────────────────────────────────────┘
```

---

# 61. Attention Visual Hierarchy

Use strong visual hierarchy.

```text
HIGH
    prominent

MEDIUM
    noticeable

LOW
    subtle

NONE
    normal
```

Do not make every card visually loud.

The product should help users focus.

---

# 62. Confidence UI

Confidence should be visible but secondary.

Example:

```text
HIGH ATTENTION
High confidence
```

or:

```text
HIGH ATTENTION
Low confidence — data conflict
```

This is one of the product's strongest differentiation points.

---

# 63. Market Context UI

Show context only when useful.

Example:

```text
INFY  -5.1%
NIFTY -1.2%

→ 3.9 pp weaker than benchmark
```

This is more informative than showing a generic red percentage.

---

# 64. First View UI

If no baseline:

```text
INFY
₹1,495.20

No previous view yet.

[Start tracking]
```

Do not fabricate:

```text
"Up 0%"
```

---

# 65. Data Quality UI

Examples:

```text
Fresh
Delayed
Stale
Data conflict
```

For stale:

```text
Latest trusted price from 14 min ago.
```

For conflict:

```text
Data conflict — confidence reduced.
```

---

# 66. Frontend Seen-State Flow

Pseudo-code:

```ts
async function handleVisibleSecurity(item: SnapshotItem) {
  if (item.change.state === "FIRST_VIEW") {
    return;
  }

  await markSeen({
    observationId: item.market.observationId,
    observedAt: item.market.observedAt,
    baselineVersion: item.seen.baselineVersion,
  });
}
```

But do not call this for every render.

Use a controlled user-view event or explicit "Mark as seen" action.

For the competition demo, an explicit button is safest and easiest to reason
about.

---

# 67. API Client

Create one API client:

```text
src/lib/api.ts
```

Responsibilities:

```text
base URL
JSON handling
error parsing
request IDs
```

Do not scatter:

```ts
fetch(...)
```

through every component.

---

# 68. Frontend State

Avoid Redux unless the application actually needs it.

Use:

```text
React Query / TanStack Query
```

for server state.

Local React state for:

```text
modal open
selected security
temporary form state
```

---

# 69. Demo Provider

This is strongly recommended.

The demo provider should support deterministic scenarios:

```text
NORMAL
BIG_MOVE
MARKET_WIDE_DROP
VOLUME_SPIKE
DATA_DELAY
DATA_CONFLICT
LATE_OBSERVATION
CORPORATE_ACTION
```

Example:

```ts
type DemoScenario =
  | "NORMAL"
  | "BIG_MOVE"
  | "MARKET_WIDE_DROP"
  | "VOLUME_SPIKE"
  | "DATA_DELAY"
  | "DATA_CONFLICT"
  | "LATE_OBSERVATION"
  | "CORPORATE_ACTION";
```

This makes the final demo reproducible even if an external provider fails.

---

# 70. Demo Dataset

Seed a small set:

```text
INFY
RELIANCE
HDFCBANK
TCS
ICICIBANK
SBIN
```

Benchmarks:

```text
NIFTY
SENSEX
```

Sectors:

```text
IT
ENERGY
BANKING
```

Do not seed hundreds of securities.

---

# 71. Demo Scenario 1 — Big Individual Move

Baseline:

```text
INFY = ₹1,500
```

Current:

```text
INFY = ₹1,425
```

Change:

```text
-5%
```

Benchmark:

```text
-1%
```

Relative:

```text
-4 pp
```

Volume:

```text
2.4× baseline
```

Expected:

```text
Attention = HIGH
Confidence = HIGH
```

Explanation:

```text
INFY is down 5.0% since your last check and is
underperforming the benchmark by 4.0 percentage points.
Volume is 2.4× its recent baseline.
```

---

# 72. Demo Scenario 2 — Market-Wide Drop

Stock:

```text
-5%
```

Benchmark:

```text
-4.8%
```

Expected:

```text
Attention = MEDIUM or LOW
```

depending on configured thresholds.

The point is:

```text
large raw movement
≠
large relative anomaly
```

---

# 73. Demo Scenario 3 — Data Conflict

Provider A:

```text
₹1,000
```

Provider B:

```text
₹1,080
```

Expected:

```text
Attention = potentially HIGH
Confidence = LOW
```

UI:

```text
Large movement detected
Low confidence — data conflict
```

---

# 74. Demo Scenario 4 — Corporate Action

Baseline:

```text
₹1,000
```

Current:

```text
₹500
```

2:1 split occurred.

Naive:

```text
-50%
```

Adjusted:

```text
approximately unchanged
```

Expected:

```text
No false HIGH alert.
```

This is an excellent Q&A scenario.

---

# 75. Demo Scenario 5 — Multi-Device Race

Start:

```text
baseline = O10
version = 5
```

Device A sends:

```text
O11, version 5
```

Device B sends:

```text
O12, version 5
```

First successful update:

```text
version = 6
```

Second:

```text
STALE_SEEN_UPDATE
```

Expected invariant:

```text
baseline never moves backwards.
```

---

# 76. Worker Design

For the MVP, use a simple scheduled worker.

```text
every 30 seconds
    ↓
load active securities
    ↓
batch into provider limits
    ↓
fetch
    ↓
validate
    ↓
normalize
    ↓
quality checks
    ↓
persist observations
    ↓
build context
    ↓
create snapshot
```

If the provider supports 50 LTP instruments per call, batch accordingly rather
than issuing one request per security. citeturn0news20

---

# 77. Worker Pseudocode

```ts
async function runMarketIngestion() {
  const securities = await securityRepository.getActiveSecurities();

  const batches = chunk(securities, 50);

  const observations = [];

  for (const batch of batches) {
    const raw = await provider.getQuotes(batch);

    const normalized = raw
      .map(normalize)
      .map(validate)
      .filter(isAcceptable);

    observations.push(...normalized);
  }

  const persisted = await observationRepository.insertMany(observations);

  const trusted = selectTrustedObservations(persisted);

  await marketStateService.update(trusted);

  await snapshotService.create(trusted);
}
```

Do not make one giant database transaction around the entire market.

Batch appropriately.

---

# 78. Job Locking

If the worker can accidentally run twice concurrently, add a simple lock.

Options:

```text
PostgreSQL advisory lock
```

or a Redis lock.

For MVP, PostgreSQL advisory locking is sufficient.

Concept:

```text
try acquire ingestion lock
    ↓
if unavailable:
    exit
else:
    run ingestion
    release lock
```

This prevents duplicate overlapping jobs.

---

# 79. Background Worker Failure

If worker fails:

```text
log failure
retain last trusted market state
mark freshness degraded
retry next scheduled run
```

Do not:

```text
delete old market data
```

or:

```text
replace with zeros
```

---

# 80. API Authorization

Even for a challenge:

```text
every watchlist endpoint
    → verify user owns watchlist
```

Do not trust:

```text
watchlistId
```

from the browser.

Query:

```text
watchlist WHERE id = ? AND user_id = currentUser
```

---

# 81. Authentication Strategy for 72 Hours

Use one of:

### Option A — Demo user

Simplest:

```text
userId = fixed seeded demo user
```

Use only if the challenge does not require real authentication.

### Option B — Minimal email/password

If auth is required:

```text
bcrypt/argon2 password hashing
JWT/session
```

Do not spend half the challenge building OAuth.

The product intelligence matters more.

---

# 82. Logging

Every request should have:

```text
requestId
method
path
status
duration
```

Worker logs:

```text
jobId
provider
batchSize
successCount
failureCount
duration
```

Assessment logs should include:

```text
securityId
baselineObservationId
currentObservationId
ruleVersion
attention
confidence
```

Do not log access tokens.

---

# 83. Metrics

Minimal metrics:

```text
market_ingestion_success
market_ingestion_failure
provider_latency_ms
observations_processed
observations_rejected
conflicts_detected
snapshot_generation_latency
snapshot_api_latency
seen_state_conflicts
```

This gives useful engineering evidence during Q&A.

---

# 84. Testing Strategy

Testing priority:

```text
1. Signal engine
2. Significance engine
3. Confidence engine
4. Seen-state concurrency
5. Observation ordering
6. Corporate action
7. API authorization
8. Watchlist CRUD
9. Frontend happy path
```

Do not spend most of the time testing CSS.

---

# 85. Unit Tests — Signal Engine

Must test:

```text
+5% move
-5% move
0% move
missing baseline
zero baseline
market-relative calculation
sector-relative calculation
volume ratio
52-week high
52-week low
```

---

# 86. Unit Tests — Significance

Test:

```text
large raw move + market also falls
large raw move + market stable
moderate move + high volume
no signals
missing sector
missing volume history
```

Expected output must be deterministic.

---

# 87. Unit Tests — Confidence

Test:

```text
fresh + valid + no conflict → HIGH

fresh + missing sector → MEDIUM

stale + valid → LOW

conflict → LOW

invalid baseline → LOW
```

---

# 88. Unit Tests — Corporate Action

Test:

```text
no action
split
bonus
action outside comparison window
action with missing factor
multiple actions
```

Most importantly:

```text
split should not create a false huge movement.
```

---

# 89. Concurrency Integration Test

Run:

```text
two seen updates simultaneously
```

Both use the same baseline version.

Expected:

```text
exactly one succeeds
one fails as stale
```

This is a high-value engineering test.

---

# 90. Late Data Integration Test

Insert:

```text
O10 @ 10:00
O12 @ 10:02
O11 @ 10:01
```

in arrival order:

```text
O10
O12
O11
```

Expected latest:

```text
O12
```

not:

```text
O11
```

---

# 91. Snapshot Consistency Test

Create:

```text
Security A → snapshot 10
Security B → snapshot 10
```

Then generate snapshot 11.

A response must identify which snapshot version it uses.

Never silently combine:

```text
A@10
B@11
```

without declaring that mixed state.

---

# 92. API Integration Tests

At minimum:

```text
create watchlist
add security
duplicate add
remove security
snapshot
mark seen
stale mark seen
unauthorized watchlist
```

---

# 93. E2E Test

One complete Playwright flow:

```text
open app
→ open watchlist
→ see changed security
→ inspect explanation
→ click mark as seen
→ refresh
→ change disappears / baseline updates
```

Then:

```text
simulate market movement
→ refresh
→ new change appears
```

---

# 94. TypeScript Strictness

Use:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

Do not disable strictness to make compilation easier.

---

# 95. Input Validation

Validate every external boundary:

```text
HTTP body
HTTP params
HTTP query
provider response
environment variables
```

Example:

```ts
const createWatchlistSchema = z.object({
  name: z.string().trim().min(1).max(100),
});
```

Never trust provider JSON simply because the request returned HTTP 200.

---

# 96. Monetary Representation

Inside JavaScript:

Do not rely on:

```ts
number
```

for final financial arithmetic where precision matters.

For the MVP, one practical approach is:

```text
DB: NUMERIC
API: decimal strings where necessary
calculations: decimal library
```

Use a decimal arithmetic library if calculations become extensive.

Do not casually use:

```ts
0.1 + 0.2
```

style floating-point arithmetic for financial values.

---

# 97. Time Handling

Store all backend timestamps as:

```text
UTC
```

Use:

```text
timestamptz
```

Frontend converts to local display time.

Never store:

```text
"09:45"
```

without a date/timezone context.

---

# 98. Configuration Management

Create one config module:

```text
src/config/index.ts
```

It should parse:

```text
PORT
DATABASE_URL
REDIS_URL
MARKET_DATA_PROVIDER
GROWW_API_BASE_URL
GROWW_ACCESS_TOKEN
MARKET_REFRESH_INTERVAL_SECONDS
SIGNIFICANCE_RULE_VERSION
```

Fail fast if a required environment variable is missing.

---

# 99. Database Migration Strategy

Use ordered migrations:

```text
001_users.sql
002_sectors.sql
003_securities.sql
004_watchlists.sql
005_watchlist_items.sql
006_market_observations.sql
007_market_snapshots.sql
008_context.sql
009_seen_states.sql
010_corporate_actions.sql
011_assessments.sql
012_evidence.sql
```

Never manually edit the production database without a migration.

---

# 100. Seed Strategy

Create:

```text
seeds/
├── users.ts
├── sectors.ts
├── securities.ts
└── demo-market-state.ts
```

Seed IDs can be deterministic UUIDs for reproducible demos.

---

# 101. Local Development

Recommended:

```text
Docker
  ├── PostgreSQL
  └── Redis
```

Then:

```bash
npm install
docker compose up -d
npm run migrate
npm run seed
npm run dev
```

Frontend:

```text
http://localhost:5173
```

API:

```text
http://localhost:3000
```

---

# 102. Docker Compose

Minimal services:

```yaml
services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: watchlist
    ports:
      - "5432:5432"

  redis:
    image: redis:8
    ports:
      - "6379:6379"
```

Pin versions in the actual project after verifying the available image versions
at implementation time.

---

# 103. Health Endpoints

Implement:

```http
GET /health
GET /ready
```

`/health`:

```json
{
  "status": "ok"
}
```

`/ready` verifies:

```text
database reachable
```

and, if Redis is required:

```text
redis reachable
```

Do not make Redis a readiness requirement if the application can operate
without it.

---

# 104. API Contract Testing

The frontend and backend must share the same response types.

Recommended:

```text
packages/contracts
```

Example:

```ts
export interface WatchlistSnapshotResponse {
  watchlist: WatchlistSummary;
  market: MarketSnapshotSummary;
  items: SnapshotItem[];
}
```

This reduces frontend/backend mismatch.

---

# 105. Implementation Order — Day 1

## Hours 0–3

Create:

```text
repo
package setup
TypeScript
Fastify
React
Docker Compose
environment config
```

Verify:

```text
frontend opens
backend starts
PostgreSQL connects
```

---

## Hours 3–7

Implement:

```text
database migrations
users
sectors
securities
watchlists
watchlist_items
```

Test CRUD.

---

## Hours 7–12

Implement:

```text
market_observations
provider interface
demo provider
normalization
validation
freshness
market snapshot
```

At this point you should be able to:

```text
seed market data
GET latest market state
```

---

# 106. Implementation Order — Day 2

## Hours 12–16

Build:

```text
signal engine
```

Write tests immediately.

---

## Hours 16–20

Build:

```text
market context
volume anomaly
level detection
corporate-action adjustment
```

Test every one.

---

## Hours 20–24

Build:

```text
significance engine
confidence engine
evidence
explanation
```

Now the backend should be able to answer:

```text
What changed?
Why does it matter?
How confident are we?
```

---

# 107. Implementation Order — Day 3

## Hours 24–28

Build:

```text
seen-state
atomic concurrency
snapshot endpoint
```

Test multi-device race.

---

## Hours 28–34

Build frontend:

```text
watchlist page
security cards
attention hierarchy
confidence
explanation
freshness
```

---

## Hours 34–40

Build:

```text
watchlist management
search
add/remove
reorder
```

---

## Hours 40–48

Build:

```text
demo scenarios
provider failure
conflict scenario
corporate action scenario
late data scenario
```

---

# 108. Final 24 Hours

## Hours 48–54

Testing:

```text
unit
integration
E2E
edge cases
```

## Hours 54–60

Polish:

```text
loading states
empty states
error states
responsive UI
copy
animations only if useful
```

## Hours 60–66

Demo rehearsal:

```text
first view
big move
market-wide move
conflict
corporate action
multi-device race
```

## Hours 66–72

Freeze.

Do not introduce major architecture changes.

Perform:

```text
clean install
fresh database
fresh seed
full build
full test
production-like run
```

Then record the demo.

---

# 109. Definition of Done — Backend

Backend is not done until:

```text
[ ] npm build passes
[ ] TypeScript strict passes
[ ] migrations run from empty database
[ ] seed works
[ ] health endpoint works
[ ] watchlist CRUD works
[ ] security CRUD works
[ ] market ingestion works
[ ] provider adapter works
[ ] demo provider works
[ ] observations are ordered by observedAt
[ ] stale data is classified
[ ] conflicts are classified
[ ] corporate action layer works
[ ] signals are deterministic
[ ] significance is deterministic
[ ] confidence is separate
[ ] evidence is persisted/generated
[ ] snapshot endpoint works
[ ] seen state is atomic
[ ] stale seen update is rejected
[ ] authorization is enforced
```

---

# 110. Definition of Done — Frontend

```text
[ ] watchlists load
[ ] securities can be added
[ ] securities can be removed
[ ] snapshot loads
[ ] HIGH changes are visually prominent
[ ] confidence is visible
[ ] explanations are understandable
[ ] freshness is visible
[ ] first-view state works
[ ] mark-seen works
[ ] refresh preserves baseline
[ ] empty state works
[ ] error state works
[ ] loading state works
[ ] mobile layout is acceptable
```

---

# 111. Definition of Done — Intelligence

```text
[ ] raw price change works
[ ] market-relative change works
[ ] sector-relative change works
[ ] volume anomaly works
[ ] level detection works
[ ] missing context is NOT_AVAILABLE
[ ] market-wide moves are contextualized
[ ] corporate actions do not create false alerts
[ ] confidence degrades on conflicts
[ ] explanation uses only evidence
[ ] every assessment has provenance
```

---

# 112. Definition of Done — Reliability

```text
[ ] provider timeout handled
[ ] provider invalid response handled
[ ] stale data handled
[ ] conflicting data handled
[ ] late data handled
[ ] duplicate data handled
[ ] concurrent seen update handled
[ ] missing baseline handled
[ ] market closed handled
[ ] empty watchlist handled
[ ] unknown security handled
```

---

# 113. Common Mistakes — DO NOT MAKE THESE

## Mistake 1

Using:

```text
received_at
```

instead of:

```text
observed_at
```

for market ordering.

---

## Mistake 2

Updating SeenState when the API is called.

Correct:

```text
user actually views/marks the observation
```

---

## Mistake 3

Using one opaque score.

Correct:

```text
signals
→ evidence
→ significance
→ attention
```

---

## Mistake 4

Treating confidence as attention.

Correct:

```text
attention ≠ confidence
```

---

## Mistake 5

Using today's benchmark return against a user's arbitrary baseline.

Correct:

```text
comparison windows must align
```

---

## Mistake 6

Ignoring corporate actions.

Correct:

```text
adjust or downgrade confidence
```

---

## Mistake 7

Making the LLM decide market significance.

Correct:

```text
deterministic engine decides
LLM may phrase
```

---

## Mistake 8

Making Redis the source of truth.

Correct:

```text
PostgreSQL = durable truth
Redis = cache
```

---

## Mistake 9

Adding Kafka to impress judges.

Correct:

```text
show correctness + scale reasoning
```

---

## Mistake 10

Hard-coding demo behavior inside production logic.

Correct:

```text
DemoProvider
```

must be replaceable through the provider interface.

---

# 114. Security Checklist

```text
[ ] secrets in environment variables
[ ] no tokens in Git
[ ] authorization on watchlists
[ ] input validation
[ ] parameterized SQL
[ ] no stack traces to clients
[ ] request IDs
[ ] rate limiting if exposed publicly
[ ] CORS restricted to frontend origin
```

---

# 115. Performance Targets

These are engineering targets for the challenge, not external guarantees.

Aim for:

```text
GET snapshot p95 < 500 ms
watchlist CRUD p95 < 300 ms
signal calculation < 50 ms per watchlist
market batch processing < a few seconds
```

If real provider latency dominates:

```text
do not fetch provider data synchronously during every frontend request.
```

The worker should maintain market state.

---

# 116. Scalability Model

The key optimization:

```text
DO ONCE:
security price
benchmark context
sector context
volume baseline
level status

DO PER USER:
baseline comparison
attention
personalized ranking
seen state
```

Therefore:

```text
10,000 users watching INFY
```

does not mean:

```text
10,000 provider calls
```

or:

```text
10,000 market-relative calculations
```

---

# 117. Future Scaling Path

If the product becomes large:

```text
Current:
modular monolith
+
worker
+
PostgreSQL
+
Redis
```

Then:

```text
high ingestion volume
        ↓
queue / streaming layer
```

and:

```text
high API volume
        ↓
read replicas / caching
```

and only later:

```text
domain extraction
```

The current architecture does not block these changes.

---

# 118. What to Keep Out of MVP

Do not implement unless everything else is complete:

```text
real trading
orders
portfolio analytics
options analytics
social feeds
news summarization
LLM agent
push notifications
mobile app
complex ML
personalized investment advice
```

The project is a smart watchlist, not a complete brokerage.

---

# 119. Final Demo Flow

The final 5-minute demo should roughly be:

## 0:00–0:30

Show normal watchlist.

Say:

```text
"This is not just showing me prices.
It remembers what I last saw."
```

## 0:30–1:30

Trigger:

```text
INFY -5%
benchmark -1%
volume 2.4×
```

Show:

```text
HIGH attention
HIGH confidence
```

## 1:30–2:15

Open explanation:

```text
why this matters
```

Show relative context.

## 2:15–3:00

Trigger market-wide fall.

Show that the system does not flag every stock equally.

## 3:00–3:45

Trigger data conflict.

Show:

```text
HIGH attention
LOW confidence
```

## 3:45–4:30

Show corporate-action scenario.

Explain why naive comparison would be wrong.

## 4:30–5:00

Show architecture:

```text
provider
→ validation
→ trusted state
→ context
→ significance
→ confidence
→ seen state
```

Finish with:

> "The core idea is simple: don't just tell users what changed. Tell them
> what changed since they last looked, whether it is actually unusual, and how
> much they should trust that conclusion."

---

# 120. Final Verification Procedure

Before submission, perform this exact sequence.

## Step 1 — Clean checkout

Clone repository into a new directory.

## Step 2 — Install

```bash
npm ci
```

## Step 3 — Start infrastructure

```bash
docker compose up -d
```

## Step 4 — Run migrations

```bash
npm run migrate
```

## Step 5 — Seed

```bash
npm run seed
```

## Step 6 — Build

```bash
npm run build
```

## Step 7 — Unit tests

```bash
npm test
```

## Step 8 — E2E tests

```bash
npm run test:e2e
```

## Step 9 — Start

```bash
npm run start
```

## Step 10 — Manual smoke test

```text
create watchlist
→ add INFY
→ view snapshot
→ mark seen
→ change market
→ reload
→ verify change
→ mark seen
→ reload
→ verify baseline advanced
```

---

# 121. Final Architecture Consistency Check

The implementation must preserve this chain:

```text
             EXTERNAL MARKET DATA
                       │
                       ▼
              Provider Adapter
                       │
                       ▼
                  Validation
                       │
                       ▼
                 Normalization
                       │
                       ▼
                 Data Quality
                       │
                       ▼
              Trusted Observation
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Market        Sector      Historical
       Context       Context      Context
          │            │            │
          └────────────┼────────────┘
                       ▼
                 Signal Engine
                       │
                       ▼
             Significance Engine
                       │
               ┌───────┴───────┐
               ▼               ▼
           Attention       Confidence
               │               │
               └───────┬───────┘
                       ▼
                    Evidence
                       │
                       ▼
                  Explanation
                       │
                       ▼
               User Watchlist
                       │
                       ▼
                  User Seen
                       │
                       ▼
               New Baseline
```

If an implementation decision breaks this chain, stop and reconsider it.

---

# 122. Final "Do Not Ship" Conditions

Do not submit if any of these are true:

```text
[ ] Seen state is only localStorage
[ ] Seen state can move backwards
[ ] stale data is shown as fresh
[ ] conflicting data is silently averaged
[ ] corporate actions can create false alerts
[ ] significance depends on an LLM
[ ] explanations invent causes
[ ] market-relative comparisons use mismatched time windows
[ ] latest observation uses received_at instead of observed_at
[ ] provider credentials are hard-coded
[ ] API trusts arbitrary watchlist IDs
[ ] frontend and backend response schemas disagree
[ ] clean install does not work
[ ] demo requires a live provider with no fallback
```

---

# 123. Final Implementation Principle

The implementation should optimize for:

```text
CORRECTNESS
    >
COMPLEXITY
```

and:

```text
EXPLAINABILITY
    >
MAGIC
```

and:

```text
PRODUCT VALUE
    >
INFRASTRUCTURE THEATER
```

The strongest version of this project is not the one with the most code.

It is the one where a judge can ask:

> "Why did this stock get a HIGH alert?"

and the team can answer immediately:

```text
Because:
- it moved X% since this user last saw it,
- the benchmark moved Y%,
- the relative move was Z pp,
- volume was N× normal,
- the observation was fresh,
- there was no data conflict,
- no corporate-action adjustment was required,
- and rule version v1 classified those validated facts as HIGH.
```

That is the implementation standard this guide is designed to enforce.
