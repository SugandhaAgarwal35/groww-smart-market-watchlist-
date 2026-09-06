# 03 --- System Architecture

# Smart Market Watchlist

**Project:** Code by Groww 2026\
**Challenge:** Build a Smart Market Watchlist\
**Document:** System Architecture\
**Version:** 2.0 — Top-20 Submission Architecture\
**Status:** Proposed / Top-20-Oriented Engineering Architecture\
**Reference Documents:** `01_PRD.md`, `02_SRS.md`\
**Architecture review date:** 04 September 2026

------------------------------------------------------------------------

# 1. Architecture Objective

The architecture must solve one central problem:

> **Given a user's watchlist and their last trusted seen state,
> determine what has meaningfully changed and present the most important
> changes with enough context to trust the result.**

The architecture therefore prioritizes:

1.  Correctness of user-seen state.
2.  Reliable market-data handling.
3.  Deterministic and explainable change detection.
4.  Low-latency watchlist reads.
5.  Graceful degradation when external data is unavailable.
6.  Clear separation between provider-specific code and product logic.
7.  Simplicity appropriate for a 72-hour engineering challenge.
8.  A clean path to scale without starting with unnecessary distributed
    infrastructure.

------------------------------------------------------------------------

# 2. Architecture Decision Summary

## Recommended Architecture

Use a **modular monolith + asynchronous market-data ingestion worker**, with
a clear separation between **market state, context, signal detection,
significance assessment, and user-seen state**.

The key architectural insight is:

> **Detecting that something changed is not the same as deciding that the
> change matters to this user.**

``` text
                              ┌───────────────────────────┐
                              │          Browser          │
                              │     React / TypeScript    │
                              └─────────────┬─────────────┘
                                            │ HTTPS
                                            ▼
                    ┌──────────────────────────────────────────┐
                    │              Backend API                 │
                    │            Modular Monolith              │
                    │                                          │
                    │ Auth / Users                              │
                    │ Watchlists                                │
                    │ Snapshot Read Model                       │
                    │ Seen-State                                 │
                    │ Market Context                             │
                    │ Signal Engine                              │
                    │ Significance + Confidence                  │
                    │ Explanation / Ranking                      │
                    └──────────────┬─────────────────┬─────────┘
                                   │                 │
                                   ▼                 ▼
                         ┌────────────────┐   ┌───────────────┐
                         │   PostgreSQL   │   │     Redis     │
                         │ Durable Truth  │   │ Optional L2   │
                         └───────▲────────┘   └───────▲───────┘
                                 │                    │
                                 │            latest snapshots /
                                 │            short-lived results
                                 │
                    ┌────────────┴─────────────────────────────┐
                    │        Market Data Worker                 │
                    │                                           │
                    │ Fetch → Validate → Normalize              │
                    │ → Order → Deduplicate → Quality           │
                    │ → Persist → Update Market State           │
                    └────────────────┬──────────────────────────┘
                                     │
                      ┌──────────────┴───────────────┐
                      ▼                              ▼
              ┌────────────────┐            ┌────────────────┐
              │ Primary Source │            │ Optional Source│
              │ Provider       │            │ / Demo adapter │
              └────────────────┘            └────────────────┘

Market state then flows through:

Raw Observation
      ↓
Normalized Observation
      ↓
Trusted Market State
      ↓
Market / Sector Context
      ↓
Security-Level Signals
      ↓
User Baseline Comparison
      ↓
Significance Assessment
      ↓
Attention + Confidence
      ↓
Structured Evidence
      ↓
Explanation + Ranking
      ↓
Watchlist Snapshot
```

### Why this architecture is stronger

A normal watchlist architecture asks:

> "What is the current price?"

This architecture asks:

> "What changed, relative to the right baseline, is it actually unusual,
> how trustworthy is the evidence, and why should this user care?"

### Core design decisions

1. **Change detection and significance are separate stages.**
2. **User baseline is durable and exact.**
3. **Market context is computed independently of any one user.**
4. **Attention and confidence are separate dimensions.**
5. **Every user-facing conclusion is traceable to structured evidence.**
6. **Corporate actions are handled before price-comparison signals.**
7. **Observation ordering uses market/source timestamps, not arrival order.**
8. **Raw, normalized, trusted, and derived data are distinct concepts.**
9. **The API remains stateless; PostgreSQL owns durable user state.**
10. **The architecture stays simple where distributed infrastructure adds no
    meaningful product value.**

This keeps the implementation achievable in 72 hours while giving the demo a
defensible engineering story.

# 3. Current External API Context

As of **04 September 2026**, Groww publicly documents a Trading API with
live market-data endpoints and historical-data functionality. Its
live-data documentation describes quote, LTP, and OHLC APIs; the LTP
endpoint supports up to 50 instruments per request. Groww's API
documentation also describes live quotes containing fields such as last
price, day change, OHLC, volume and 52-week high/low.
citeturn0search0turn0search2

Groww's public API changelog states that historical market-data APIs
were introduced in October 2025 with historical data from 2020 onward
and intervals ranging from 1 minute to 1 month. citeturn0search1

### Architectural implication

The system should use an **internal market-data abstraction**:

``` text
MarketDataProvider
       │
       ├── GrowwProvider
       ├── DemoProvider
       └── FutureProvider
```

We should **not couple the business logic directly to Groww's external
response schema**.

The actual provider used for the submission depends on credentials,
access, licensing, rate limits, and challenge constraints. The
architecture must allow a compliant alternative/demo provider without
changing the product layer.

------------------------------------------------------------------------

# 4. Architectural Principles

## 4.1 Server Is the Source of Truth

The browser must not be authoritative for:

-   Watchlist ownership.
-   Seen state.
-   Market-data freshness.
-   Meaningful-change scores.

------------------------------------------------------------------------

## 4.2 Raw Data and Derived Data Are Separate

The system should distinguish:

``` text
Raw market observation
        ↓
Normalized observation
        ↓
Derived signals
        ↓
Attention score
        ↓
User-facing explanation
```

This makes calculations reproducible and debuggable.

------------------------------------------------------------------------

## 4.3 Provider Independence

External provider-specific schemas belong inside the market-data
adapter.

Business logic receives a normalized internal model.

------------------------------------------------------------------------

## 4.4 Deterministic First

The first meaningful-change engine should be deterministic.

Given identical:

``` text
baseline
+
current observation
+
benchmark observation
+
historical context
+
configuration
```

it should produce the same result.

This makes the product:

-   Explainable.
-   Testable.
-   Reproducible in demos.
-   Easier to debug.

------------------------------------------------------------------------

## 4.5 Strong Consistency Where Meaning Depends on It

User-seen state affects the meaning of:

> "Since your last check."

Therefore, seen-state writes require stronger consistency than
disposable cache data.

------------------------------------------------------------------------

## 4.6 Cache Is an Optimization

If Redis disappears, the application should remain logically correct.

Redis must never be the only source of durable user state.

------------------------------------------------------------------------

## 4.7 Graceful Degradation

If optional context is unavailable:

``` text
News unavailable
        ↓
Still show trusted quote
        ↓
Mark context unavailable
```

The system should degrade in capability, not fabricate certainty.

------------------------------------------------------------------------

# 5. Component Architecture

# 5.1 Frontend

Recommended:

-   React
-   TypeScript
-   Vite or equivalent modern build tool
-   Component-based UI
-   Server-state management through a lightweight query/cache layer
-   Responsive CSS/UI system

### Responsibilities

The frontend should:

-   Render watchlists.
-   Request current snapshots.
-   Render meaningful changes.
-   Display freshness.
-   Manage user interactions.
-   Submit watchlist mutations.
-   Submit defined seen-state updates.
-   Handle loading/error/empty states.

### The frontend should NOT:

-   Fetch market providers directly.
-   Calculate authoritative attention scores.
-   Store authoritative seen state.
-   Decide whether data is stale.
-   Trust client-provided prices.
-   Implement provider-specific business logic.

------------------------------------------------------------------------

# 5.2 Backend API

Recommended:

**TypeScript + Node.js + Fastify/NestJS/Express**

For this challenge, a lightweight TypeScript backend is preferred
because:

-   Frontend and backend share the language.
-   Validation/types can be shared carefully.
-   Development speed is high.
-   The change engine is straightforward to test.
-   It is sufficient for the expected prototype scale.

### Backend modules

``` text
src/
├── auth/
├── users/
├── watchlists/
├── securities/
├── market-data/
├── change-engine/
├── seen-state/
├── benchmarks/
├── events/
├── health/
├── config/
└── shared/
```

These are **logical modules**, not necessarily separate deployed
services.

------------------------------------------------------------------------

# 5.3 Database

Recommended:

**PostgreSQL**

Why PostgreSQL?

-   Relational relationships match the domain.
-   Strong transactions are useful for seen-state updates.
-   Unique constraints prevent duplicate watchlist memberships.
-   Indexing supports watchlist and security queries.
-   JSON/JSONB can store provider-specific metadata where justified.
-   It is mature and easy to run locally/cloud-hosted.

------------------------------------------------------------------------

# 5.4 Redis

Redis is **optional for MVP**.

Use it for:

-   Latest quote caching.
-   Short-lived market snapshots.
-   Rate limiting.
-   Computed summary caching where useful.

Do not use Redis as the durable source of:

-   Users.
-   Watchlists.
-   Memberships.
-   Seen state.

If time is constrained, PostgreSQL + application memory for local
development is sufficient initially.

------------------------------------------------------------------------

# 5.5 Market Data Worker

A separate worker process should periodically or event-drivenly obtain
market data.

Responsibilities:

``` text
Fetch
 ↓
Validate
 ↓
Normalize
 ↓
Timestamp
 ↓
Deduplicate
 ↓
Persist/cache
 ↓
Trigger relevant derived calculations
```

The worker should not contain user-interface logic.

------------------------------------------------------------------------

# 6. Market Data Architecture

## 6.1 Provider Interface

Define an internal interface similar to:

``` text
MarketDataProvider

getQuotes(securityIds)
getHistoricalData(securityId, range)
getMarketStatus()
getSecurityMetadata(query)
```

The interface returns normalized internal objects.

Example:

``` text
NormalizedQuote

securityId
exchange
price
previousClose
absoluteChange
percentageChange
volume
observedAt
receivedAt
source
quality
freshness
```

------------------------------------------------------------------------

# 6.2 Provider Adapter

Provider-specific mapping belongs here:

``` text
External API Response
        ↓
Provider Adapter
        ↓
NormalizedQuote
```

If Provider A returns:

``` text
last_price
day_change_perc
last_trade_time
```

and Provider B returns:

``` text
ltp
changePercent
timestamp
```

the rest of the application should see the same internal object.

------------------------------------------------------------------------

# 6.3 Batch Fetching

Where provider limits permit batching, fetch multiple securities
together.

Groww's public live-data documentation currently states that LTP
supports up to 50 instruments per API call. The implementation should
still keep batch size configurable rather than hard-coding this
provider-specific number into business logic. citeturn0search2

Example:

``` text
Watchlist: 120 securities

Batch 1 → 50
Batch 2 → 50
Batch 3 → 20
```

The market-data adapter owns the batching strategy.

------------------------------------------------------------------------

# 6.4 Historical Data

Historical data is needed for:

-   Volume baseline.
-   Recent-range comparisons.
-   52-week levels.
-   Optional volatility calculations.

The historical provider interface should allow configurable lookback
periods.

------------------------------------------------------------------------

# 7. Market Data Lifecycle

``` text
Provider
   │
   ▼
Fetch
   │
   ▼
Schema Validation
   │
   ├── Invalid → Reject
   │
   ▼
Normalization
   │
   ▼
Timestamp Validation
   │
   ▼
Deduplication
   │
   ▼
Quality Classification
   │
   ├── Unusable → Do not trust
   │
   ▼
Persist / Cache
   │
   ▼
Derived Signals
```

------------------------------------------------------------------------

# 8. Data Freshness Architecture

Every observation receives a freshness classification.

Conceptually:

``` text
age = now - observedAt
```

Then:

``` text
age <= CURRENT_THRESHOLD
        → CURRENT

age <= DELAYED_THRESHOLD
        → DELAYED

age > DELAYED_THRESHOLD
        → STALE
```

If there is no trustworthy observation:

``` text
→ UNAVAILABLE
```

The thresholds must be configurable.

### Important

The frontend receives the backend's classification rather than
recalculating freshness using its own clock.

This avoids inconsistent UI behavior across devices.

------------------------------------------------------------------------

# 9. Handling Market Closed Periods

The market-data model should distinguish:

``` text
price observation
```

from:

``` text
market status
```

Example:

``` text
price = ₹1,240
observedAt = previous session close
marketStatus = CLOSED
freshness = SESSION_CLOSE
```

A previous closing price is not equivalent to a live quote.

------------------------------------------------------------------------

# 10. Data Quality Model

Each observation should have a quality state.

Recommended:

``` text
TRUSTED
DEGRADED
CONFLICTED
INVALID
UNAVAILABLE
```

### TRUSTED

Valid observation with acceptable timestamp/source.

### DEGRADED

Usable but delayed/stale or missing optional fields.

### CONFLICTED

Material disagreement between sources.

### INVALID

Fails validation.

### UNAVAILABLE

No usable value.

------------------------------------------------------------------------

# 11. Multiple Data Sources

The architecture supports multiple providers, but the MVP should avoid
unnecessary provider complexity.

If two sources are available:

``` text
Provider A ─┐
            ├── Conflict Resolver
Provider B ─┘
                  ↓
           Selected Observation
```

Selection can consider:

1.  Provider trust priority.
2.  Observation timestamp.
3.  Value plausibility.
4.  Exchange/security identity.
5.  Conflict tolerance.

If disagreement is material and cannot be resolved confidently:

``` text
quality = CONFLICTED
```

and the change engine should reduce confidence or suppress the derived
signal.

------------------------------------------------------------------------

# 12. Meaningful Change Architecture

The core product engine is split into four explicit stages:

``` text
1. CHANGE DETECTION
   What changed?

2. CONTEXTUALIZATION
   What was the market / sector doing?

3. SIGNIFICANCE ASSESSMENT
   Is the change unusual or important?

4. TRUST ASSESSMENT
   How confident are we in the conclusion?
```

This avoids treating every large percentage move as equally meaningful.

## Inputs

``` text
UserBaseline
CurrentTrustedObservation
MarketContext
HistoricalContext
CorporateActionContext
EventContext
DataQuality
Configuration
```

## Outputs

``` text
ChangeAssessment

securityId
baselineObservationId
currentObservationId
rawSignals[]
contextSignals[]
evidence[]
attentionLevel
attentionScore
confidenceLevel
confidenceScore
explanationFacts[]
```

------------------------------------------------------------------------

# 13. Four-Stage Signal Pipeline

``` text
Current Trusted Observation
            │
            ▼
    ┌─────────────────┐
    │ Change Detector │
    └────────┬────────┘
             │
      ┌──────┼──────┐
      ▼      ▼      ▼
    Price  Volume  Level
      │      │      │
      └──────┼──────┘
             ▼
    ┌─────────────────┐
    │ Context Engine  │
    └────────┬────────┘
             │
      ┌──────┼────────────┐
      ▼      ▼            ▼
  Benchmark Sector   Market Status
      │      │            │
      └──────┼────────────┘
             ▼
  ┌────────────────────────┐
  │ Significance Engine    │
  └───────────┬────────────┘
              ▼
  ┌────────────────────────┐
  │ Attention + Confidence │
  └───────────┬────────────┘
              ▼
      Structured Evidence
              ▼
       Explanation + Rank
```

------------------------------------------------------------------------

# 14. User Baseline Hierarchy

The phrase "since your last check" requires more than a timestamp.

### Level A — User Baseline

What this user actually saw:

``` text
seen_at
baseline_observation_id
baseline_price
baseline_observed_at
baseline_market_session
baseline_volume_context
baseline_version
```

### Level B — Market Baseline

What the market provides as a reference:

``` text
previous_close
session_open
current_session_return
benchmark_return
```

### Level C — Historical Baseline

What "unusual" means:

``` text
recent volatility
typical volume
recent trading range
52-week high/low
```

These references must never be silently substituted for one another.

------------------------------------------------------------------------

# 15. Corporate-Action Adjustment Layer

Naive price comparison can generate false alerts after events such as stock
splits or bonus issues.

Therefore:

``` text
Observed Price
      ↓
Corporate Action Check
      ↓
Adjusted Comparison Basis
      ↓
Change Detection
```

If adjustment information is unavailable or ambiguous:

``` text
comparisonConfidence = LOW
```

rather than presenting a potentially false large move.

### MVP scope

The implementation does not need a full corporate-actions platform. It should
still model:

- an adjustment reference,
- an adjustment factor where applicable,
- whether the baseline crosses an adjustment boundary,
- a safe fallback when adjustment data is unavailable.

------------------------------------------------------------------------

# 16. Market Context Engine

The Market Context Engine computes reusable, security-independent context.

Example:

``` text
Security return        = -5.0%
NIFTY return           = -1.0%
Sector return          = -0.8%

Stock vs market        = -4.0 pp
Stock vs sector        = -4.2 pp
```

This distinguishes:

``` text
"Everything is down"
```

from:

``` text
"This security is behaving unusually"
```

### Shared context

``` text
BenchmarkObservation
SectorObservation
MarketSession
MarketContextSnapshot
```

### Scale benefit

If 10,000 users watch the same security, market-relative performance should
not be recomputed 10,000 times.

``` text
Market Data
    ↓
Security-Level Context
    ↓
Reusable Signals
    ↓
Many User Baselines
```

------------------------------------------------------------------------

# 17. Change Signals

## 17.1 Price Change

``` text
price_change_pct =
    ((current_price - baseline_price) / baseline_price) * 100
```

Retain both absolute and percentage change.

## 17.2 Market-Relative Change

``` text
relative_move =
    security_return - benchmark_return
```

## 17.3 Sector-Relative Change

``` text
sector_relative_move =
    security_return - sector_return
```

Unavailable context becomes `NOT_AVAILABLE`, not a hidden penalty.

## 17.4 Volume Anomaly

Prefer:

``` text
volume_ratio =
    current_volume / expected_volume
```

where expected volume comes from comparable historical observations.

Insufficient history produces `NOT_AVAILABLE`.

## 17.5 Significant Level

Possible signals:

- new 52-week high,
- new 52-week low,
- recent-range breakout,
- recent-range breakdown.

## 17.6 Event Signal

Events are structured:

``` text
Event
├── type
├── occurredAt
├── source
├── severity
├── confidence
└── relatedSecurity
```

------------------------------------------------------------------------

# 18. Significance Engine

The Significance Engine answers:

> **Given the detected changes and context, does this deserve attention?**

Use an evidence-first decision model:

``` text
Evidence
   ↓
Individual contribution
   ↓
Decision rule
   ↓
Attention level
```

Example:

``` text
Price change       -5.1%        → strong
Market relative    -3.9 pp      → strong
Sector relative    -4.3 pp      → strong
Volume ratio        2.3x        → moderate
52-week level       none        → none
Data quality        trusted     → no penalty

Decision:
HIGH ATTENTION
```

The evidence is retained rather than hiding the result inside an opaque
single number.

------------------------------------------------------------------------

# 19. Attention Is Not Confidence

### Attention

How much the evidence suggests the user should look.

### Confidence

How trustworthy the evidence is.

Example:

``` text
Observed move:      -8%
Sources disagree:   yes
Timestamp quality:  degraded

Attention:          HIGH
Confidence:         LOW
```

Recommended levels:

``` text
Attention:  HIGH / MEDIUM / LOW / NONE
Confidence: HIGH / MEDIUM / LOW
```

------------------------------------------------------------------------

# 20. Confidence Assessment

Confidence considers:

``` text
source reliability
observation freshness
timestamp validity
cross-source agreement
baseline integrity
corporate-action integrity
historical-data sufficiency
```

This is a deterministic data-quality assessment, not an AI probability.

------------------------------------------------------------------------

# 21. Explanation Engine

The engine first produces structured evidence:

``` json
{
  "security": "INFY",
  "facts": [
    {"type": "PRICE_CHANGE", "value": -5.1},
    {"type": "BENCHMARK_CHANGE", "value": -1.2},
    {"type": "RELATIVE_CHANGE", "value": -3.9},
    {"type": "VOLUME_RATIO", "value": 2.3}
  ]
}
```

Only then does the presentation layer turn facts into text:

> INFY is down 5.1% since your last check and is underperforming its
> benchmark by 3.9 percentage points. Volume is 2.3× its recent baseline.

The explanation must never invent a cause not represented in the evidence.

### Optional AI

If an LLM is used, its role is limited to:

``` text
Validated Evidence
      ↓
LLM wording
      ↓
Human-readable explanation
```

It must not decide the core significance of raw market data.

------------------------------------------------------------------------

# 22. Signal Provenance

Every important assessment should be traceable.

``` text
ChangeAssessment
    │
    ├── baselineObservationId
    ├── currentObservationId
    ├── benchmarkObservationId
    ├── sectorObservationId
    ├── historicalWindowId
    ├── adjustmentReferenceId
    └── ruleVersion
```

This enables reproducibility, debugging, auditability, and regression testing.

# 23. Last-Seen State Architecture

This is a core differentiator.

The system stores the **exact market observation used as the user's
baseline**, not merely a timestamp.

``` text
User
  │
  └── Watchlist
        │
        └── Security
              │
              └── SeenState
                    │
                    └── BaselineObservation
```

Example:

``` text
SeenState
├── user_id
├── watchlist_id
├── security_id
├── baseline_observation_id
├── baseline_price
├── baseline_observed_at
├── baseline_market_session
├── baseline_version
├── seen_at
└── updated_at
```

`baseline_observation_id` answers:

> "Exactly which market observation did this user see?"

------------------------------------------------------------------------

# 24. Seen State Is a Product Event

The baseline changes only after a meaningful product event.

Recommended semantic event:

> **The security becomes seen when its watchlist representation has
> successfully rendered trustworthy data to the user and the client confirms
> the view.**

Do not update the baseline merely because:

- a background request happened,
- a worker refreshed market data,
- another browser tab fetched the snapshot,
- the server recalculated a score.

------------------------------------------------------------------------

# 25. Seen-State Concurrency

Example:

``` text
Device A sees observation O10 at 10:00
Device B sees observation O11 at 10:01
A's network request arrives after B
```

A naive last-write-wins strategy could move the baseline backwards.

The update must carry:

``` text
observation timestamp
baseline version
```

Conceptually:

``` text
if incoming.observedAt < current.baselineObservedAt:
    reject stale update
else:
    atomically advance baseline
```

------------------------------------------------------------------------

# 26. Observation Identity and Ordering

Each normalized observation should have:

``` text
observation_id
security_id
provider
source_event_id / provider timestamp
observed_at
received_at
sequence metadata where available
```

Important:

``` text
observed_at = when the source says the value existed
received_at = when our system received it
```

Ordering follows observation time, not arrival order.

Late data may be retained for audit/reprocessing but must not silently replace
newer effective market state.

------------------------------------------------------------------------

# 27. Market-State Versions

Use lightweight versions for derived state:

``` text
MarketSnapshot
├── snapshot_id
├── generated_at
├── market_session_id
└── version
```

A ChangeAssessment references the market snapshot/version used for calculation.

This prevents a watchlist response from silently mixing incompatible market
states.

The MVP does **not** require event sourcing. It requires explicit lineage and
consistent snapshot boundaries.

# 28. Watchlist Data Flow

``` text
GET /watchlists/{id}/snapshot
             │
             ▼
       Validate User
             │
             ▼
       Resolve Snapshot Version
             │
             ▼
       Load Memberships
             │
             ▼
       Load Consistent Market State
             │
             ▼
       Load User Baselines
             │
             ▼
       Calculate / Load Assessments
             │
             ▼
       Rank by Attention + Confidence
             │
             ▼
       Return Snapshot + Freshness
```

------------------------------------------------------------------------

# 29. Read Path Optimization

The normal read path should avoid expensive provider calls whenever
possible.

Preferred:

``` text
Provider
   ↓
Worker
   ↓
Latest trusted snapshot
   ↓
Cache / DB
   ↓
API
   ↓
Frontend
```

rather than:

``` text
User opens page
   ↓
Backend calls provider for every stock
   ↓
Wait
   ↓
Calculate
   ↓
Respond
```

The second design creates high latency and provider load.

------------------------------------------------------------------------

# 30. Cache Strategy

## L1 --- Process Memory

Useful for:

-   Static configuration.
-   Security metadata.
-   Small reference data.

Not durable.

## L2 --- Redis

Useful for:

-   Latest quote snapshots.
-   Short-lived computed summaries.
-   Rate limits.

## L3 --- PostgreSQL

Durable source for:

-   Users.
-   Watchlists.
-   Memberships.
-   Seen state.
-   Important normalized observations.
-   Configuration/audit records where needed.

------------------------------------------------------------------------

# 31. Cache Invalidation

Market data is time-sensitive.

Therefore:

-   Quote cache entries should have explicit TTL/freshness metadata.
-   A stale cache value must remain labelled stale.
-   Cache invalidation should not change the persisted baseline.
-   User-seen state must never be invalidated as ordinary cache data.

------------------------------------------------------------------------

# 32. API Architecture

Recommended layers:

``` text
HTTP Route
   ↓
Controller
   ↓
Application Service
   ↓
Domain Logic
   ↓
Repository / Provider
```

Example:

``` text
GET /api/v1/watchlists/123/changes
              ↓
ChangeController
              ↓
WatchlistChangeService
              ↓
SeenStateRepository
MarketSnapshotRepository
ChangeEngine
              ↓
DTO
```

------------------------------------------------------------------------

# 33. API Versioning

Use:

``` text
/api/v1/...
```

Versioning protects the frontend from future breaking API changes.

------------------------------------------------------------------------

# 34. Suggested API Surface

## Watchlists

``` text
POST   /api/v1/watchlists
GET    /api/v1/watchlists
GET    /api/v1/watchlists/:id
PATCH  /api/v1/watchlists/:id
DELETE /api/v1/watchlists/:id
```

## Memberships

``` text
POST   /api/v1/watchlists/:id/securities
DELETE /api/v1/watchlists/:id/securities/:securityId
```

## Securities

``` text
GET /api/v1/securities/search?q=...
GET /api/v1/securities/:id
```

## Market/Watchlist

``` text
GET /api/v1/watchlists/:id/snapshot
GET /api/v1/watchlists/:id/changes
```

## Seen State

``` text
POST /api/v1/watchlists/:id/seen
```

## Health

``` text
GET /api/v1/health
GET /api/v1/health/market-data
```

------------------------------------------------------------------------

# 35. Database Architecture

Core tables:

``` text
users
watchlists
watchlist_securities
securities
market_observations
seen_states
change_assessments
benchmarks
provider_health
```

Optional:

``` text
market_events
configuration_versions
audit_events
```

------------------------------------------------------------------------

# 36. Entity Relationships

``` text
users
  │ 1
  │
  │ N
watchlists
  │ 1
  │
  │ N
watchlist_securities
  │ N
  │
  │ 1
securities

users
  │
  └───────────────┐
                  │
watchlists ───────┤
                  │
securities ───────┤
                  ▼
              seen_states

securities
    │
    ▼
market_observations
    │
    ▼
change_assessments
```

------------------------------------------------------------------------

# 37. Database Constraints

Important constraints:

### Watchlist membership

``` text
UNIQUE(watchlist_id, security_id)
```

Prevents duplicates.

### Seen state

Recommended uniqueness:

``` text
UNIQUE(user_id, watchlist_id, security_id)
```

### Market observation

Use an observation/provider identity or unique event key where possible
to support idempotency.

------------------------------------------------------------------------

# 38. Important Indexes

Likely indexes:

``` text
watchlists(user_id)

watchlist_securities(watchlist_id)

watchlist_securities(security_id)

seen_states(user_id, watchlist_id, security_id)

market_observations(security_id, observed_at DESC)

change_assessments(watchlist_id, created_at DESC)

securities(symbol)

securities(name)
```

Indexes should be validated using actual query plans rather than added
indiscriminately.

------------------------------------------------------------------------

# 39. Data Retention

The MVP does not need indefinite storage of every raw market tick.

Recommended distinction:

### Durable user state

Keep:

-   Watchlists.
-   Memberships.
-   Seen state.

### Derived/market state

Retain enough history for:

-   Change calculations.
-   Demo reproducibility.
-   Required historical baselines.

Older high-frequency observations may be aggregated or expired according
to the chosen provider/data policy.

------------------------------------------------------------------------

# 40. Background Processing

The worker should handle:

``` text
Scheduled market-data refresh
        ↓
Normalization
        ↓
Persistence/cache
        ↓
Derived calculation
```

Potential later jobs:

-   Historical baseline refresh.
-   Event ingestion.
-   Cleanup.
-   Recalculation after configuration changes.

------------------------------------------------------------------------

# 41. Why Not Kafka?

Kafka is deliberately **not required for the MVP**.

The challenge has a 72-hour implementation window.

Adding Kafka would introduce:

-   Broker deployment.
-   Consumer groups.
-   Topic management.
-   Serialization.
-   Operational debugging.
-   More failure modes.

Unless real requirements demonstrate that Kafka is necessary, a worker +
database + optional Redis architecture is more appropriate.

The architecture remains extensible if the system later needs a true
event stream.

------------------------------------------------------------------------

# 42. Why Not Microservices?

Separate services for:

``` text
Auth
Watchlists
Market Data
Change Engine
Notifications
```

would create significant overhead.

For this challenge, a modular monolith gives us the same logical
separation without:

-   Network boundaries everywhere.
-   Multiple deployments.
-   Distributed tracing requirements.
-   Service discovery.
-   Inter-service authentication.
-   More complex local development.

If the market-data worker needs independent scaling, it can already run
as a separate process.

------------------------------------------------------------------------

# 43. Precomputation Strategy

Separate reusable work from user-specific work.

## Shared market-level work

``` text
latest trusted price
market-relative return
sector-relative return
volume anomaly
level status
market status
data quality
```

## User-level work

``` text
change since user's baseline
attention decision
personalized ranking
seen/unseen state
```

``` text
                 Shared Market Layer
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       Price          Context        Signals
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                User Baseline Layer
                         │
               ┌─────────┴─────────┐
               ▼                   ▼
             User A              User B
             result              result
```

------------------------------------------------------------------------

# 44. Snapshot Consistency

A watchlist response should represent one coherent market view.

Bad:

``` text
Security A → snapshot 101
Security B → snapshot 102
Security C → snapshot 103
```

Better:

``` text
Watchlist request
      ↓
Resolve market snapshot version 103
      ↓
Read all compatible security state
```

If one security has not reached the current snapshot:

``` text
status = DELAYED
```

rather than pretending all securities were observed simultaneously.

------------------------------------------------------------------------

# 45. Scaling Strategy

## Stage 1 --- Challenge Scale

``` text
1 API instance
1 Worker
PostgreSQL
Optional Redis
```

This is sufficient for development/demo.

## Stage 2 --- Increased Users

Scale API horizontally:

``` text
Load Balancer
      │
 ┌────┼────┐
 ▼    ▼    ▼
API  API  API
 │    │    │
 └────┼────┘
      ▼
 PostgreSQL
```

Because user state is server-side, API instances remain stateless.

## Stage 3 --- Increased Market Data

Scale workers independently:

``` text
Worker 1 → securities A-D
Worker 2 → securities E-H
Worker 3 → securities I-L
```

Use partitioning/sharding strategy only when justified by actual load.

------------------------------------------------------------------------

# 46. Scaling Bottlenecks

Likely bottlenecks:

1.  External market-data rate limits.
2.  Market-data ingestion.
3.  Change calculations.
4.  Database reads for large watchlists.
5.  Historical-data queries.
6.  Concurrent user requests during market volatility.

Potential solutions:

-   Batch provider calls.
-   Cache latest snapshots.
-   Precompute reusable security-level signals.
-   Index database queries.
-   Paginate large watchlists.
-   Avoid recalculating identical security-level signals for every user.

------------------------------------------------------------------------

# 47. Critical Optimization: Separate Security-Level and User-Level Work

Some calculations are independent of the user:

``` text
Current price
Market-relative performance
Volume anomaly
52-week level
```

These can be computed once per security/time window.

User-specific calculations include:

``` text
Change since user's last seen state
```

Therefore:

``` text
Market Data
     ↓
Security-Level Signals
     ↓
      ┌───────────────┐
      │               │
      ▼               ▼
User A baseline    User B baseline
      │               │
      ▼               ▼
User-specific      User-specific
assessment         assessment
```

This becomes important when many users watch the same securities.

------------------------------------------------------------------------

# 48. Failure Architecture

## Provider Timeout

``` text
Provider
   ↓ timeout
Market Data Adapter
   ↓
Retry within limit
   ↓
Fallback / Last Trusted
   ↓
Freshness = STALE/DEGRADED
```

## Database Failure

The API should fail clearly rather than pretending state was persisted.

## Redis Failure

Fall back to PostgreSQL or provider path where practical.

## Optional Context Failure

Return the quote and core change signals without the unavailable
optional signal.

------------------------------------------------------------------------

# 49. Retry Policy

Retries should be:

-   Bounded.
-   Exponential/backoff where appropriate.
-   Limited to retryable failures.
-   Idempotent.

Do not retry indefinitely.

Avoid retrying obvious client errors.

------------------------------------------------------------------------

# 50. Circuit Breaking

A full circuit-breaker library is optional for MVP.

A simple provider-health mechanism can initially track:

``` text
success_count
failure_count
last_failure_at
consecutive_failures
```

If a provider is clearly unhealthy, temporarily reduce calls rather than
creating a request storm.

------------------------------------------------------------------------

# 51. Idempotency

Operations that can be repeated by clients/workers must be idempotent.

Examples:

``` text
Add security
Update seen state
Process market observation
Process event
```

This is especially important because retries are normal in distributed
systems.

------------------------------------------------------------------------

# 52. Race Conditions

## Example

Two browser tabs simultaneously add RELIANCE.

Both issue:

``` text
POST /watchlists/1/securities
```

Database constraint:

``` text
UNIQUE(watchlist_id, security_id)
```

ensures only one effective membership exists.

The API should translate the duplicate condition into a safe/idempotent
response.

------------------------------------------------------------------------

# 53. Seen-State Race Condition

Example:

``` text
Device A sees price ₹100 at 10:00
Device B sees price ₹102 at 10:01
Device A writes later because of network delay
```

A naive last-write-wins strategy could incorrectly move the baseline
backward.

Recommended:

Store:

``` text
baseline_observed_at
baseline_version
updated_at
```

and reject or ignore a stale baseline update if its market observation
is older than the current baseline.

------------------------------------------------------------------------

# 54. Market Observation Ordering

For a security:

``` text
T1 = 10:01
T2 = 10:02
```

If T2 is processed first and T1 arrives later:

``` text
Do not replace T2 with T1.
```

The effective latest observation should be determined using provider
observation time plus source/version metadata where available.

------------------------------------------------------------------------

# 55. Security Architecture

``` text
Browser
   │ HTTPS
   ▼
API Gateway / Backend
   │
   ├── Authentication
   ├── Authorization
   ├── Validation
   └── Business Logic
        │
        ▼
   Database
```

### Important rules

-   Never expose provider secrets to browser code.
-   Validate ownership server-side.
-   Validate all IDs and query parameters.
-   Use parameterized database queries/ORM protections.
-   Protect authentication/session tokens.
-   Do not log secrets.

------------------------------------------------------------------------

# 56. Authentication Choice

For the challenge, authentication should be deliberately simple.

Options:

### Option A --- Email/password + secure session

Good for demonstrating ownership and persistence.

### Option B --- OAuth

Useful if an approved identity provider is already available.

### Option C --- Challenge/demo identity

Acceptable for a controlled demo if persistent multi-user authorization
is still represented correctly.

The final choice should depend on the deployment environment and
available time.

The architecture must not assume that a client-supplied `user_id` is
trustworthy.

------------------------------------------------------------------------

# 57. Observability

Minimum backend telemetry:

``` text
API request count
API latency
API error count
Provider latency
Provider failures
Provider freshness
Database latency
Change-engine processing time
Seen-state update failures
```

Structured logs should include correlation/request IDs.

------------------------------------------------------------------------

# 58. Health Checks

## Liveness

Answers:

> Is the process alive?

Example:

``` text
GET /api/v1/health
```

## Readiness

Answers:

> Can the service perform required work?

Check:

-   Database.
-   Critical configuration.
-   Provider availability where appropriate.

A temporary market-data provider failure should not necessarily make the
entire API process "dead."

------------------------------------------------------------------------

# 59. Configuration Architecture

Use environment/configuration for:

``` text
DATABASE_URL
REDIS_URL
MARKET_DATA_PROVIDER
MARKET_DATA_API_KEY
CURRENT_THRESHOLD
DELAYED_THRESHOLD
STALE_THRESHOLD
CHANGE_SCORE_WEIGHTS
BATCH_SIZE
RETRY_LIMIT
```

Secrets must come from secure environment/secret management, not source
code.

------------------------------------------------------------------------

# 60. Demo Mode Architecture

A deterministic demo provider should implement the same interface as the
real provider.

``` text
MarketDataProvider
       │
       ├── RealProvider
       │
       └── DemoProvider
```

Demo scenarios can be selected using controlled fixtures.

Example:

``` text
Scenario: STOCK_SPECIFIC_DROP
```

returns a reproducible market state.

This lets judges see meaningful-change behavior without waiting for a
real stock to move.

------------------------------------------------------------------------

# 61. Demo Scenario Set

The demo provider should support:

### Scenario A

Normal movement.

### Scenario B

Large stock-specific drop.

### Scenario C

Market-wide decline.

### Scenario D

Volume anomaly.

### Scenario E

New 52-week high.

### Scenario F

Stale provider data.

### Scenario G

Provider unavailable.

### Scenario H

Conflicting provider values, if multiple-provider logic is implemented.

------------------------------------------------------------------------

# 62. Deployment Architecture

A practical deployment:

``` text
                   Internet
                      │
                      ▼
              ┌──────────────┐
              │ CDN / HTTPS  │
              └──────┬───────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
     Frontend Hosting       Backend API
                                │
                     ┌──────────┼──────────┐
                     ▼          ▼          ▼
                PostgreSQL    Redis      Worker
                                             │
                                             ▼
                                      Market Provider
```

For the challenge, all components can be deployed using managed services
where possible.

------------------------------------------------------------------------

# 63. Deployment Simplicity

Do not deploy every logical module independently.

A reasonable initial deployment is:

``` text
Frontend
Backend API
Worker
Managed PostgreSQL
Optional Redis
```

This keeps deployment understandable and demonstrates architectural
separation without operational overkill.

------------------------------------------------------------------------

# 64. Frontend State Model

Separate:

### Server State

-   Watchlists.
-   Quotes.
-   Changes.
-   Seen state.
-   Market status.

### Local UI State

-   Selected watchlist.
-   Search input.
-   Modal state.
-   Sorting/filtering.
-   Expanded card.

Do not put authoritative market data into uncontrolled browser-local
state.

------------------------------------------------------------------------

# 65. Frontend Data Refresh

The frontend should not aggressively poll every security.

Recommended:

``` text
Initial load
    ↓
Cached/current snapshot
    ↓
Periodic refresh
```

Refresh frequency should depend on:

-   Market status.
-   User activity.
-   Provider freshness.
-   Product needs.

During closed market periods, aggressive quote polling is unnecessary.

------------------------------------------------------------------------

# 66. API Response Design

The watchlist snapshot should be designed around the user's task.

Example conceptual response:

``` json
{
  "watchlist": {
    "id": "wl_123",
    "name": "My Stocks"
  },
  "market": {
    "status": "OPEN"
  },
  "summary": {
    "meaningfulChanges": 3,
    "highAttention": 1,
    "mediumAttention": 2
  },
  "changes": [
    {
      "securityId": "INFY",
      "attention": "HIGH",
      "confidence": "HIGH",
      "priceChange": -5.1,
      "relativeChange": -3.9,
      "explanation": "..."
    }
  ],
  "securities": []
}
```

The exact contract belongs in the implementation guide.

------------------------------------------------------------------------

# 67. Error Response Design

Use consistent errors:

``` json
{
  "error": {
    "code": "MARKET_DATA_STALE",
    "message": "Latest trusted market data is stale.",
    "requestId": "req_123"
  }
}
```

The frontend should map known error codes to appropriate UI behavior.

------------------------------------------------------------------------

# 68. Security vs Performance Trade-off

Authorization must happen server-side.

Do not optimize away ownership checks merely because the frontend
already knows which watchlist is open.

A small authorization query is preferable to cross-user data exposure.

Caching must also be user-safe:

``` text
Cache key:
watchlist:{watchlistId}:snapshot
```

and authorization must still be validated before returning private
state.

------------------------------------------------------------------------

# 69. Architecture Risks

## Risk 1 --- Provider rate limits

**Mitigation:** batching, caching, bounded refresh.

## Risk 2 --- Stale data mistaken for current

**Mitigation:** server-side freshness classification.

## Risk 3 --- Incorrect last-seen state

**Mitigation:** transactional persistence + baseline timestamp/version.

## Risk 4 --- Noisy change detection

**Mitigation:** multi-signal deterministic scoring + threshold
calibration.

## Risk 5 --- Provider schema changes

**Mitigation:** provider adapter.

## Risk 6 --- Over-engineering

**Mitigation:** modular monolith and optional infrastructure.

## Risk 7 --- Demo depends on live market behavior

**Mitigation:** deterministic demo provider.

------------------------------------------------------------------------

# 70. Architecture Review: Why This Is Top-20 Oriented

| Judging criterion | Architectural response |
|---|---|
| Engineering Depth | Baseline hierarchy, snapshot consistency, observation lineage, context engine, signal/significance separation |
| Product Interpretation | "Since your last check" is modeled as durable user state |
| Edge Cases & Resilience | stale/conflicted data, late observations, corporate actions, concurrent updates, provider failure |
| Code Quality & Simplicity | modular monolith, explicit interfaces, deterministic rules |
| Originality | attention vs confidence, market-relative context, evidence provenance |
| Scalability | shared security-level computation + user-level personalization |
| Demo Reliability | deterministic provider + reproducible assessment lineage |

### Deliberate non-decisions

We are **not** adding Kafka, Kubernetes, microservices for every domain, a
full ML significance model, an LLM as the source of truth, or a full
event-sourcing platform.

Those technologies may be useful at different scales, but they do not solve
the core challenge better within a 72-hour build.

### Strongest demo story

The product is not:

> "We built a watchlist with an API."

It is:

> "We preserve exactly what the user last saw, compare it against a
> consistent market snapshot, separate raw change from contextual
> significance, quantify data confidence independently, and explain every
> alert from traceable evidence."

# 71. Architecture Alternatives Considered

## Alternative A --- Frontend-only application

### Pros

-   Very fast.
-   Simple deployment.

### Cons

-   Weak persistence semantics.
-   Exposes provider credentials.
-   Poor reliability.
-   Difficult multi-user state.
-   Change calculations can be tampered with.

**Decision:** Reject.

------------------------------------------------------------------------

## Alternative B --- Full microservices

### Pros

-   Independent scaling.
-   Strong service boundaries.

### Cons

-   Large operational overhead.
-   Slower development.
-   More failure modes.
-   Excessive for challenge scope.

**Decision:** Reject for MVP.

------------------------------------------------------------------------

## Alternative C --- Serverless-only

### Pros

-   Easy deployment.
-   Automatic scaling.

### Cons

-   Background market-data processing can become awkward.
-   Provider polling may be inefficient.
-   Local debugging can be more complex.

**Decision:** Possible future deployment option, but not required by
architecture.

------------------------------------------------------------------------

## Alternative D --- Modular monolith + worker

### Pros

-   Fast.
-   Testable.
-   Clear boundaries.
-   Simple deployment.
-   Easy scaling path.

### Cons

-   Some modules share a deployment/runtime.
-   Very large future scale may require extraction.

**Decision:** **Selected.**

------------------------------------------------------------------------

# 72. Technology Decision Table

  ------------------------------------------------------------------------
  Component               Recommended Choice       Reason
  ----------------------- ------------------------ -----------------------
  Frontend                React + TypeScript       Fast development and
                                                   maintainable UI

  Backend                 Node.js + TypeScript     Shared language and
                                                   strong ecosystem

  API framework           Fastify/NestJS/Express   Choose one based on
                                                   implementation speed

  Database                PostgreSQL               Transactions,
                                                   constraints, relational
                                                   model

  Cache                   Redis, optional          Fast latest-data/cache
                                                   layer

  Worker                  Node.js worker/process   Simple asynchronous
                                                   ingestion

  Validation              Zod or equivalent        Runtime validation +
                                                   types

  Testing                 Vitest/Jest + API/E2E    Deterministic testing
                          tooling                  

  Deployment              Managed hosting          Minimize operational
                                                   burden
  ------------------------------------------------------------------------

The exact library choice should be finalized before implementation based
on the team's familiarity and deployment environment.

------------------------------------------------------------------------

# 73. Architecture-to-Requirements Traceability

  Requirement               Architecture Component
  ------------------------- ------------------------------------
  Watchlist persistence     PostgreSQL + Watchlist module
  Latest market data        Market Data Provider + Worker
  Last-seen state           Seen State module + PostgreSQL
  Meaningful change         Change Engine
  Market-relative context   Benchmark module
  Volume anomaly            Historical Data + Change Engine
  Freshness                 Market Data Quality module
  Provider failure          Adapter + Worker + fallback policy
  Conflicting data          Provider Resolver
  Multi-device state        Server-side Seen State
  Concurrency               DB constraints + transactions
  Scalability               Stateless API + worker scaling
  Explainability            Structured Change Assessment
  Demo reproducibility      Demo Provider
  Security                  Auth + Authorization + validation
  Observability             Logs + metrics + health endpoints

------------------------------------------------------------------------

# 74. Critical Design Decisions

The following decisions are intentionally explicit for the final
presentation/Q&A.

### Decision 1

**Use a modular monolith rather than microservices.**

Reason: the problem benefits from clear module boundaries but does not
require distributed-service complexity at challenge scale.

### Decision 2

**Persist exact user baseline observations.**

Reason: "since last check" must be deterministic and reproducible.

### Decision 3

**Use a deterministic change engine first.**

Reason: explainability and correctness are more valuable than opaque
intelligence for this challenge.

### Decision 4

**Treat freshness as first-class data.**

Reason: a stale number can create a misleading meaningful-change
conclusion.

### Decision 5

**Separate market-level calculations from user-level comparisons.**

Reason: this enables efficient scaling when many users watch the same
securities.

### Decision 6

**Use a provider abstraction.**

Reason: market-data availability and provider contracts can change;
product logic should remain independent.

### Decision 7

**Build deterministic demo data.**

Reason: judging should demonstrate system behavior rather than depend on
unpredictable live-market movement.

------------------------------------------------------------------------

# 75. What We Deliberately Do Not Build

The architecture does not initially include:

-   Kafka.
-   Kubernetes.
-   Multiple backend microservices.
-   Machine-learning inference infrastructure.
-   Complex event sourcing.
-   Real-time WebSocket infrastructure unless actual UX requirements
    justify it.
-   A large notification service.
-   A dedicated search cluster.
-   A complex data lake.

These can be introduced later only if a concrete scaling or product
requirement demands them.

------------------------------------------------------------------------

# 76. Future Evolution

If the product succeeds and traffic grows substantially:

``` text
Modular Monolith
       ↓
Extract Market Data Service
       ↓
Introduce Event Stream
       ↓
Scale Change Processing
       ↓
Materialize Security-Level Signals
       ↓
Add specialized read models
```

The architecture therefore starts simple without preventing future
evolution.

------------------------------------------------------------------------

# 77. Final Architecture

The proposed production-minded challenge architecture is:

``` text
                         ┌──────────────────────┐
                         │      React UI        │
                         │    TypeScript        │
                         └──────────┬───────────┘
                                    │
                                  HTTPS
                                    │
                                    ▼
                  ┌────────────────────────────────┐
                  │         Backend API             │
                  │       Modular Monolith          │
                  │                                │
                  │ Auth                           │
                  │ Watchlists                     │
                  │ Securities                      │
                  │ Market Data                    │
                  │ Change Engine                  │
                  │ Seen State                     │
                  │ Benchmarks                     │
                  │ Health / Observability         │
                  └──────────────┬─────────────────┘
                                 │
                ┌────────────────┼─────────────────┐
                │                │                 │
                ▼                ▼                 ▼
        ┌──────────────┐  ┌─────────────┐  ┌──────────────┐
        │ PostgreSQL   │  │    Redis    │  │ Demo/Real    │
        │ Source Truth │  │ Optional    │  │ Provider     │
        └──────────────┘  └─────────────┘  └──────▲───────┘
                                                   │
                                          ┌────────┴────────┐
                                          │ Market Worker   │
                                          │                 │
                                          │ Fetch           │
                                          │ Normalize      │
                                          │ Validate       │
                                          │ Deduplicate    │
                                          │ Persist/Cache  │
                                          └─────────────────┘
```

------------------------------------------------------------------------

# 78. Final Architectural Principle

The system should be judged by whether it can reliably transform:

``` text
Market Data
     +
User's Last-Seen State
     +
Context
     +
Data Quality
```

into:

``` text
Meaningful Changes
     ↓
Attention Ranking
     ↓
Clear Explanation
```

The architecture deliberately keeps the infrastructure simple while
making the **data correctness, user-state semantics, change detection,
and resilience** sophisticated.

That is the most defensible balance for the Code by Groww 2026
evaluation criteria.

------------------------------------------------------------------------

# 79. Next Document

The next document is **`04_UML_Diagrams.md`**.

It should convert this architecture into precise diagrams for:

1.  System context.
2.  Use cases.
3.  Component architecture.
4.  Deployment architecture.
5.  Watchlist creation sequence.
6.  Market-data ingestion sequence.
7.  "Since last check" sequence.
8.  Meaningful-change calculation sequence.
9.  Seen-state update sequence.
10. Provider failure/fallback sequence.
11. Data model/class diagram.
12. Key activity/state diagrams.

Each diagram should correspond to an actual requirement or architectural
decision rather than being decorative.


------------------------------------------------------------------------

# Final Architecture Decision

**Selected for implementation:**

``` text
React / TypeScript
        │
        ▼
Modular Monolith API
        │
        ├── Watchlists + Auth
        ├── Seen-State
        ├── Snapshot Read Model
        ├── Market Context
        ├── Signal Engine
        ├── Significance Engine
        ├── Confidence Engine
        └── Explanation / Ranking
        │
        ├───────────────┐
        ▼               ▼
 PostgreSQL           Redis
        ▲
        │
 Market Data Worker
        │
        ▼
 Provider Adapter(s)
```

The architecture is deliberately **deep where correctness matters and simple
where infrastructure does not create product value**.
