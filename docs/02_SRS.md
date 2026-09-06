# 02 --- Software Requirements Specification (SRS)

# Smart Market Watchlist

**Project:** Code by Groww 2026\
**Challenge:** Build a Smart Market Watchlist\
**Document:** Software Requirements Specification\
**Version:** 1.0\
**Status:** Proposed / Engineering Challenge Submission\
**Reference Product Document:** `01_PRD.md`\
**Last reviewed:** 04 September 2026

------------------------------------------------------------------------

# 1. Purpose

This document converts the product decisions in `01_PRD.md` into
precise, testable software requirements.

The system's central responsibility is to help a user understand:

> **What meaningfully changed in my watchlist since I last checked, and
> what deserves my attention now?**

The SRS defines the required behavior of the frontend, backend,
persistence layer, market-data integration, meaningful-change engine,
and reliability mechanisms.

------------------------------------------------------------------------

# 2. Current Challenge Context

The Code by Groww 2026 challenge requires an end-to-end frontend and
backend implementation of a Smart Market Watchlist.

The minimum product capability is:

1.  Create and manage a watchlist.
2.  View latest market information.
3.  Return later and see what has changed.

The challenge deliberately leaves implementation choices open, including
the definition of meaningful change, persistence strategy,
stale/conflicting data handling, and scalability.

This SRS therefore specifies **our product interpretation**, rather than
assuming an official Groww implementation.

------------------------------------------------------------------------

# 3. Product Scope

## 3.1 In Scope

The system shall support:

-   User identification/authentication sufficient for persistent state.
-   Watchlist creation and management.
-   Security search and selection.
-   Latest market information.
-   Market-data timestamps and freshness status.
-   Persistent user-seen state.
-   Comparison between current market state and the user's previous seen
    state.
-   Meaningful-change detection.
-   Attention scoring and prioritization.
-   Human-readable explanations.
-   Market-relative context where supported.
-   Basic anomaly detection where reliable historical data exists.
-   Resilient handling of unavailable, delayed, stale, and conflicting
    data.
-   Responsive frontend access.
-   Backend APIs.
-   Observability sufficient to diagnose failures and incorrect results.

## 3.2 Out of Scope for MVP

The system shall not require:

-   Trade execution.
-   Portfolio accounting.
-   Investment advice.
-   Price prediction.
-   Automated trading.
-   Complex machine-learning models.
-   Social feeds.
-   A full brokerage terminal.
-   High-frequency trading infrastructure.
-   Complex notification infrastructure.

------------------------------------------------------------------------

# 4. Actors

## 4.1 User

A registered application user who:

-   Creates or manages watchlists.
-   Views market information.
-   Views meaningful changes.
-   Acknowledges/marks information as seen through normal product
    interaction.

## 4.2 Market Data Provider

An external system supplying:

-   Security metadata.
-   Quotes.
-   Historical observations.
-   Volume information where available.
-   Market status where available.
-   Event information where supported.

The provider is considered an **untrusted external dependency** from the
application's reliability perspective.

## 4.3 Application Backend

Responsible for:

-   Authentication/session validation.
-   Watchlist persistence.
-   Market-data normalization.
-   Change detection.
-   Attention scoring.
-   User-state persistence.
-   API responses.
-   Error handling.

## 4.4 Database

Stores durable application state including:

-   Users.
-   Watchlists.
-   Watchlist memberships.
-   Securities.
-   User-seen state.
-   Relevant market snapshots/events.
-   Data-quality metadata.
-   Optional derived change records.

------------------------------------------------------------------------

# 5. High-Level System Behavior

``` text
User
  |
  v
Frontend
  |
  v
Backend API
  |
  +--------------------+
  |                    |
  v                    v
Watchlist Store     Market Data Layer
  |                    |
  |                    v
  |              Normalization
  |                    |
  |                    v
  |              Change Detection
  |                    |
  |                    v
  |              Attention Scoring
  |                    |
  +---------+----------+
            |
            v
      User-Specific Comparison
            |
            v
       Smart Summary
            |
            v
         Frontend
```

------------------------------------------------------------------------

# 6. Functional Requirements

## FR-001 --- User Identification

The system shall uniquely identify each user.

### Acceptance Criteria

-   Each persisted watchlist belongs to exactly one user.
-   User A must not be able to retrieve User B's watchlists.
-   User identity must remain stable across sessions.

------------------------------------------------------------------------

## FR-002 --- Create Watchlist

The user shall be able to create a watchlist with a user-defined name.

### Acceptance Criteria

-   A valid name creates a persistent watchlist.
-   The created watchlist has a unique identifier.
-   The watchlist is associated with the authenticated user.
-   Duplicate watchlist names may be allowed unless the product later
    chooses otherwise.

------------------------------------------------------------------------

## FR-003 --- Rename Watchlist

The user shall be able to rename an existing watchlist.

### Acceptance Criteria

-   Only the owner can rename it.
-   Empty/invalid names shall be rejected.
-   The new name shall persist across sessions.

------------------------------------------------------------------------

## FR-004 --- Delete Watchlist

The user shall be able to delete a watchlist.

### Acceptance Criteria

-   Only the owner can delete it.
-   Deleted watchlists shall no longer appear in normal user views.
-   Associated user-seen state shall no longer affect active watchlist
    calculations.

------------------------------------------------------------------------

## FR-005 --- Add Security

The user shall be able to add a supported security to a watchlist.

### Acceptance Criteria

-   A security must be selected using a stable security identifier.
-   The same security shall not be inserted twice into the same
    watchlist.
-   The operation shall be idempotent.
-   The membership shall persist.

------------------------------------------------------------------------

## FR-006 --- Remove Security

The user shall be able to remove a security from a watchlist.

### Acceptance Criteria

-   The membership is removed from active watchlist results.
-   Historical data may remain for audit/analytics purposes.
-   The removed security shall not appear in current watchlist
    summaries.

------------------------------------------------------------------------

## FR-007 --- View Watchlist

The system shall return the current contents of a selected watchlist.

Each security row shall contain, where available:

-   Security name.
-   Symbol/identifier.
-   Latest price.
-   Absolute change.
-   Percentage change.
-   Timestamp.
-   Freshness status.
-   Attention status when calculated.

------------------------------------------------------------------------

## FR-008 --- Security Search

The system shall allow users to search supported securities.

### Requirements

Search should support:

-   Symbol.
-   Security name.
-   Exchange identifier where applicable.

Results shall use stable identifiers rather than relying only on display
names.

------------------------------------------------------------------------

# 7. Market Data Requirements

## FR-009 --- Latest Market Data

The system shall retrieve the latest available market observation for
each supported security.

At minimum, a quote should contain:

``` text
security_id
price
previous_close
absolute_change
percentage_change
observed_at
received_at
source
freshness_status
```

Additional fields may include:

``` text
volume
day_high
day_low
52_week_high
52_week_low
market_status
currency
```

------------------------------------------------------------------------

## FR-010 --- Data Normalization

All external market data shall be normalized into an internal
representation before being used by the change-detection engine.

Normalization shall handle:

-   Field naming differences.
-   Timestamp formats.
-   Currency representation.
-   Missing fields.
-   Provider-specific status values.
-   Duplicate observations.

The change engine must not depend directly on provider-specific schemas.

------------------------------------------------------------------------

## FR-011 --- Data Timestamp

Every market observation used for a meaningful-change calculation shall
retain:

-   Provider observation timestamp, if available.
-   Backend receipt timestamp.
-   Data source identifier.

This enables freshness and ordering decisions.

------------------------------------------------------------------------

## FR-012 --- Freshness Classification

Every displayed quote shall have a freshness classification.

Minimum states:

``` text
CURRENT
DELAYED
STALE
UNAVAILABLE
```

Thresholds shall be configurable rather than hard-coded throughout the
application.

### Rule

The UI must never label a quote as current/live when the backend has
classified it as stale.

------------------------------------------------------------------------

## FR-013 --- Market Closed State

When the relevant market is closed, the system shall distinguish:

-   Last traded/available value.
-   Current market status.

The product must not imply that the displayed price is changing live
when the market is closed.

------------------------------------------------------------------------

## FR-014 --- Missing Data

If a required field is unavailable:

-   The system shall not fabricate a value.
-   The API shall return an appropriate nullable/missing state.
-   The frontend shall display a meaningful fallback.

------------------------------------------------------------------------

# 8. Meaningful Change Requirements

## FR-015 --- Baseline State

The system shall maintain a baseline representing the user's last
relevant seen state.

A baseline shall be associated with:

-   User.
-   Watchlist.
-   Security.
-   Observation/reference timestamp.
-   Relevant market values.
-   Data-quality state.

------------------------------------------------------------------------

## FR-016 --- Current vs Baseline Comparison

When the user returns to a watchlist, the backend shall compare the
current trusted market state with the applicable baseline.

The comparison may include:

``` text
Price change since baseline
Percentage change since baseline
Market-relative change
Sector-relative change
Volume anomaly
Significant price level
Relevant event
```

Only signals supported by available trustworthy data shall participate.

------------------------------------------------------------------------

## FR-017 --- Meaningful Change Score

The system shall calculate an explainable meaningful-change/attention
score.

The initial implementation shall be deterministic and rule-based.

Conceptually:

``` text
score =
    price_signal
  + relative_signal
  + volume_signal
  + level_signal
  + event_signal
  - data_quality_penalty
```

The exact weights shall be configuration-driven.

------------------------------------------------------------------------

## FR-018 --- Price Movement Signal

The system shall calculate price movement relative to the user's
baseline.

The calculation shall use:

``` text
percentage_change =
    ((current_price - baseline_price) / baseline_price) * 100
```

Where `baseline_price != 0`.

Invalid or non-positive baselines shall not produce a valid percentage
comparison.

------------------------------------------------------------------------

## FR-019 --- Market-Relative Signal

Where benchmark data is available, the system should compare security
performance against an appropriate broad-market benchmark.

Example:

``` text
Stock:     -5.0%
Benchmark: -1.0%

Relative underperformance: -4.0 percentage points
```

The system shall describe this as relative performance, not as a
prediction or recommendation.

------------------------------------------------------------------------

## FR-020 --- Sector-Relative Signal

Where sector classification and benchmark data are available, the system
should calculate sector-relative performance.

If sector information is unavailable, the system shall gracefully omit
this signal.

------------------------------------------------------------------------

## FR-021 --- Volume Anomaly

Where reliable volume history exists, the system may compare current
volume against a historical baseline.

Example:

``` text
current volume / baseline volume = 2.3x
```

The baseline methodology shall be documented in the implementation.

Volume anomaly shall not be calculated from insufficient or invalid
history.

------------------------------------------------------------------------

## FR-022 --- Significant Price Levels

Where reliable historical data exists, the system may detect:

-   New 52-week high.
-   New 52-week low.
-   Significant movement outside a recent range.

The system shall not infer these states from incomplete historical data.

------------------------------------------------------------------------

## FR-023 --- Event Signals

If supported market/company event data is available, the system may
incorporate:

-   Earnings.
-   Dividends.
-   Splits.
-   Buybacks.
-   Other material corporate actions.

Event data must include source and timestamp where possible.

------------------------------------------------------------------------

# 9. Attention Classification

## FR-024 --- Attention Levels

Each meaningful change shall map to one of:

``` text
HIGH
MEDIUM
LOW
NONE
```

### HIGH

Used for unusually large or multi-signal changes.

### MEDIUM

Used for noticeable changes that warrant awareness.

### LOW

Used for relatively minor but potentially useful changes.

### NONE

Used when the observed difference is normal/noise or insufficiently
trustworthy.

------------------------------------------------------------------------

## FR-025 --- Ranking

The watchlist summary shall rank meaningful changes by attention score.

The ordering should prioritize:

1.  High-confidence, high-impact changes.
2.  Strong relative anomalies.
3.  Multi-signal changes.
4.  Medium changes.
5.  Low changes.

Ties shall use deterministic secondary ordering.

------------------------------------------------------------------------

## FR-026 --- Noise Suppression

The system shall avoid prominently surfacing routine movements.

The threshold must be configurable and tested against representative
market scenarios.

------------------------------------------------------------------------

# 10. Explanation Requirements

## FR-027 --- Human-Readable Explanation

Every surfaced meaningful change shall contain a concise explanation.

An explanation should answer:

-   What changed?
-   By how much?
-   Since when?
-   What contextual signal makes it meaningful?

Example:

``` text
INFY is down 5.1% since your last check,
underperforming its sector by 3.9 percentage points.
Trading volume is also above its recent baseline.
```

------------------------------------------------------------------------

## FR-028 --- Explanation Traceability

The backend shall retain enough structured signal information to
reproduce why an item received its attention score.

Example:

``` text
price_signal = strong
relative_signal = strong
volume_signal = moderate
data_quality_penalty = 0
final_level = HIGH
```

This is required for debugging and demo explanation.

------------------------------------------------------------------------

# 11. Last-Seen State Requirements

## FR-029 --- Seen State Semantics

The application shall define a precise event for updating the user's
baseline.

Recommended MVP behavior:

> A security becomes "seen" when the user successfully loads a watchlist
> view containing that security and the system has successfully returned
> trustworthy data for that security.

Simply opening the application without loading the relevant watchlist
shall not update its baseline.

------------------------------------------------------------------------

## FR-030 --- Atomic Seen-State Update

Updating a user's seen state shall be atomic with respect to the
relevant observation.

The system must avoid:

``` text
Read current data
↓
User leaves
↓
Partial baseline write
```

resulting in an invalid baseline.

------------------------------------------------------------------------

## FR-031 --- Multi-Device Behavior

A user's seen state shall be stored server-side.

If the same account is used on multiple devices:

-   The backend remains the source of truth.
-   The latest valid seen-state update becomes the new baseline.
-   Concurrent updates must be handled deterministically.

------------------------------------------------------------------------

## FR-032 --- Idempotent Seen Update

Repeating the same seen-state operation shall not corrupt state or
create duplicate baselines.

------------------------------------------------------------------------

## FR-033 --- First Visit

If no baseline exists:

The system shall show current market information but must not falsely
claim:

> "Changed since your last check."

Instead, the UI should indicate that this is the user's first observed
state.

------------------------------------------------------------------------

## FR-034 --- Long Absence

If a user returns after a long period, the system shall still compare
against the stored baseline where it remains valid.

The UI should communicate the elapsed period.

Example:

``` text
Since your last check · 12 days
```

Historical comparison limitations must be respected.

------------------------------------------------------------------------

# 12. Data Quality and Conflicting Sources

## FR-035 --- Source Metadata

Every normalized observation shall retain its source.

## FR-036 --- Observation Ordering

When observations for the same security are received out of order, older
observations shall not overwrite a newer trusted observation.

## FR-037 --- Duplicate Observations

Duplicate observations shall be handled idempotently.

## FR-038 --- Conflicting Values

If two trusted sources provide materially conflicting values:

-   The system shall apply a documented source-selection policy.
-   The selected value shall retain source metadata.
-   A severe unresolved conflict shall reduce confidence or result in
    unavailable data.
-   The system shall not silently present an obviously inconsistent
    value as certain.

## FR-039 --- Provider Failure

If the primary provider fails:

-   The application shall use a configured fallback if one exists.
-   Otherwise it shall return the last trustworthy state with an
    appropriate freshness label.
-   If no trustworthy value exists, it shall return `UNAVAILABLE`.

------------------------------------------------------------------------

# 13. API Requirements

The backend shall expose versioned APIs.

Illustrative API surface:

``` text
POST   /api/v1/watchlists
GET    /api/v1/watchlists
GET    /api/v1/watchlists/{id}
PATCH  /api/v1/watchlists/{id}
DELETE /api/v1/watchlists/{id}

POST   /api/v1/watchlists/{id}/securities
DELETE /api/v1/watchlists/{id}/securities/{securityId}

GET    /api/v1/securities/search?q=...
GET    /api/v1/watchlists/{id}/snapshot
GET    /api/v1/watchlists/{id}/changes
POST   /api/v1/watchlists/{id}/seen
```

The exact API contract shall be finalized in `03_System_Architecture.md`
and `05_Implementation_Guide.md`.

------------------------------------------------------------------------

# 14. API Consistency Requirements

## FR-040

Mutating operations shall be idempotent where practical.

## FR-041

APIs shall return stable identifiers rather than requiring clients to
infer identity from names.

## FR-042

Pagination shall be supported for potentially large watchlists or search
results.

## FR-043

API errors shall use consistent machine-readable error codes.

Example:

``` json
{
  "error": {
    "code": "MARKET_DATA_STALE",
    "message": "Latest trusted market data is stale."
  }
}
```

## FR-044

The backend shall validate all user-supplied identifiers and ownership.

------------------------------------------------------------------------

# 15. Frontend Requirements

## FR-045 --- Dashboard

The main watchlist screen shall make the following visible without
requiring deep navigation:

-   Watchlist name.
-   Market status.
-   Number of meaningful changes.
-   Highest-priority change.
-   Current quote information.
-   Freshness state.

------------------------------------------------------------------------

## FR-046 --- Since Last Check Section

If a valid baseline exists, the UI shall show a dedicated summary such
as:

``` text
Since your last check

3 meaningful changes
1 high attention
2 medium attention
```

------------------------------------------------------------------------

## FR-047 --- Change Cards

A change card shall show:

-   Security.
-   Attention level.
-   Current movement.
-   Comparison period.
-   Context.
-   Data freshness.

------------------------------------------------------------------------

## FR-048 --- Detail View

The user shall be able to inspect a security in more detail.

The detail view may include:

-   Price.
-   Change.
-   Chart.
-   Relative performance.
-   Volume.
-   Significant levels.
-   Events.
-   Data-source/freshness information.

------------------------------------------------------------------------

## FR-049 --- Empty State

An empty watchlist shall explain how to add securities.

------------------------------------------------------------------------

## FR-050 --- Error State

Frontend failures shall provide:

-   Human-readable explanation.
-   Retry action where appropriate.
-   Preservation of already loaded trustworthy information.

------------------------------------------------------------------------

# 16. Non-Functional Requirements

# NFR-001 --- Correctness

The system shall never fabricate market values.

Calculations shall use validated input data.

------------------------------------------------------------------------

# NFR-002 --- Data Freshness Transparency

Every market observation displayed to the user shall have a freshness
status.

------------------------------------------------------------------------

# NFR-003 --- Availability

Core watchlist functionality should remain usable when non-critical
external dependencies fail.

For example, if contextual event data is unavailable, current quote
information may still be displayed if trustworthy.

------------------------------------------------------------------------

# NFR-004 --- Performance

For a normal watchlist size, the application should provide a responsive
experience without requiring the frontend to perform expensive
market-data calculations.

Target values shall be validated through benchmarking rather than
presented as guaranteed production SLAs for the challenge.

------------------------------------------------------------------------

# NFR-005 --- Scalability

The architecture shall support increasing:

-   Users.
-   Watchlists.
-   Securities per watchlist.
-   Market observations.

The change engine should avoid recomputing unnecessary data for
unrelated users/watchlists.

------------------------------------------------------------------------

# NFR-006 --- Consistency

Watchlist membership and user-seen state shall be strongly consistent
where incorrect state could change the meaning of "since your last
check."

------------------------------------------------------------------------

# NFR-007 --- Security

The system shall:

-   Authenticate users.
-   Authorize access to watchlists.
-   Validate inputs.
-   Protect session credentials.
-   Avoid exposing another user's data.
-   Avoid storing unnecessary secrets.
-   Use encrypted transport.

------------------------------------------------------------------------

# NFR-008 --- Observability

The backend shall provide sufficient logs/metrics to investigate:

-   Market-data failures.
-   Stale-data incidents.
-   Change-calculation errors.
-   API latency.
-   Database failures.
-   Incorrect seen-state updates.

Logs must not expose sensitive credentials.

------------------------------------------------------------------------

# NFR-009 --- Maintainability

The system shall separate:

``` text
Market data acquisition
       ↓
Normalization
       ↓
Business rules
       ↓
Persistence
       ↓
API presentation
```

This prevents provider-specific logic from spreading through the
application.

------------------------------------------------------------------------

# NFR-010 --- Explainability

A developer should be able to inspect a change record and understand why
it received its score.

------------------------------------------------------------------------

# 17. Reliability Requirements

## REL-001 --- External Dependency Timeout

External market-data requests shall have bounded timeouts.

## REL-002 --- Retry Control

Retries shall be bounded and shall not create request storms.

## REL-003 --- Fallback

Fallback providers may be used where available and justified.

## REL-004 --- Stale-While-Available

A last-known trustworthy observation may be returned when fresh data is
unavailable, but it must be labelled appropriately.

## REL-005 --- No Silent Corruption

Provider failures must never cause invalid values to become trusted
state.

------------------------------------------------------------------------

# 18. Concurrency Requirements

## CON-001

Concurrent watchlist additions must not create duplicate membership
records.

## CON-002

Concurrent rename/delete operations must resolve deterministically.

## CON-003

Concurrent seen-state updates must preserve a valid state.

## CON-004

Out-of-order market observations must not replace newer observations.

## CON-005

Repeated API requests caused by frontend retries must not create
duplicate business events.

------------------------------------------------------------------------

# 19. Security Requirements

## SEC-001 --- Authentication

Only authenticated users may access persistent personal watchlists.

## SEC-002 --- Authorization

Every watchlist operation must verify ownership or explicit permission.

## SEC-003 --- Input Validation

The backend shall validate:

-   Watchlist IDs.
-   Security IDs.
-   Names.
-   Query parameters.
-   Pagination values.
-   Timestamps where client-supplied.

## SEC-004 --- Rate Limiting

Public or expensive endpoints should be rate-limited where necessary.

## SEC-005 --- Secret Management

Market-data API credentials must never be exposed to the frontend.

## SEC-006 --- Sensitive Logging

Authentication tokens, API keys, and sensitive user data must not appear
in ordinary application logs.

------------------------------------------------------------------------

# 20. Data Integrity Requirements

## DI-001

Every watchlist membership must reference an existing watchlist and
supported security.

## DI-002

A user-seen record must reference an existing user/watchlist/security
relationship where applicable.

## DI-003

Market observations must have valid timestamps.

## DI-004

Duplicate market observations must not create duplicate effective state.

## DI-005

Deleting a watchlist must not leave active orphaned state.

------------------------------------------------------------------------

# 21. Error Handling

The system shall distinguish between:

### Client Error

Example:

``` text
INVALID_WATCHLIST_ID
INVALID_SECURITY
UNAUTHORIZED
```

### Market Data Error

``` text
MARKET_DATA_UNAVAILABLE
MARKET_DATA_STALE
MARKET_DATA_CONFLICT
```

### Internal Error

``` text
INTERNAL_ERROR
DATABASE_UNAVAILABLE
PROCESSING_FAILED
```

The frontend should expose useful messages without exposing
implementation details.

------------------------------------------------------------------------

# 22. Acceptance Scenarios

## AC-001 --- Create and populate watchlist

**Given:** authenticated user\
**When:** user creates a watchlist and adds three supported securities\
**Then:** all three securities persist and appear in the watchlist.

------------------------------------------------------------------------

## AC-002 --- First visit

**Given:** watchlist has no seen baseline\
**When:** user opens it\
**Then:** current information is displayed and no false "since last
check" claim is made.

------------------------------------------------------------------------

## AC-003 --- Meaningful stock-specific move

**Given:** baseline exists\
**When:** a security falls materially while its benchmark remains
relatively stable\
**Then:** the security receives elevated attention and the explanation
identifies the relative movement.

------------------------------------------------------------------------

## AC-004 --- Normal movement

**Given:** baseline exists\
**When:** a security moves within its normal range\
**Then:** it is not prominently surfaced as a meaningful change.

------------------------------------------------------------------------

## AC-005 --- Market-wide movement

**Given:** a security and its benchmark both decline similarly\
**When:** the change engine runs\
**Then:** the system recognizes that the move is largely
market/sector-wide and avoids overstating stock-specific significance.

------------------------------------------------------------------------

## AC-006 --- Stale quote

**Given:** latest provider observation exceeds the configured freshness
threshold\
**When:** the watchlist is loaded\
**Then:** the value is labelled stale and is not treated as a fresh
market event.

------------------------------------------------------------------------

## AC-007 --- Provider failure

**Given:** primary provider is unavailable\
**When:** user requests watchlist data\
**Then:** fallback data is used if trustworthy and available; otherwise
last-known data is labelled appropriately.

------------------------------------------------------------------------

## AC-008 --- Conflicting providers

**Given:** providers return materially conflicting observations\
**When:** normalization occurs\
**Then:** the documented conflict policy is applied and the system
avoids silently treating a questionable value as fully trusted.

------------------------------------------------------------------------

## AC-009 --- Multi-device state

**Given:** the user views a watchlist on Device A\
**When:** the user later opens the same watchlist on Device B\
**Then:** Device B uses the server-side seen state.

------------------------------------------------------------------------

## AC-010 --- Duplicate add

**Given:** security X is already in watchlist Y\
**When:** the client submits another add request for X\
**Then:** the operation remains idempotent and only one membership
exists.

------------------------------------------------------------------------

## AC-011 --- Out-of-order market update

**Given:** observation T2 is newer than T1\
**When:** T1 arrives after T2\
**Then:** T1 must not overwrite the effective latest state.

------------------------------------------------------------------------

## AC-012 --- Explainability

**Given:** a change is classified as HIGH\
**When:** developer or evaluator inspects the change\
**Then:** structured signals identify why the score reached HIGH.

------------------------------------------------------------------------

# 23. Business Rules

## BR-001

A price change alone does not automatically equal a meaningful change.

## BR-002

A meaningful change must be based only on available trustworthy data.

## BR-003

Relative movement can increase significance when a security behaves
materially differently from its benchmark.

## BR-004

Data-quality problems can reduce or invalidate significance.

## BR-005

The same event must not repeatedly generate duplicate meaningful-change
records solely because of polling or retries.

## BR-006

The user-seen baseline represents the application's defined "seen"
event, not simply an arbitrary backend access.

## BR-007

The system shall describe observed market conditions rather than make
unsupported predictions or investment recommendations.

------------------------------------------------------------------------

# 24. Configuration Requirements

The following must be configurable:

-   Freshness thresholds.
-   Meaningful-change thresholds.
-   Attention-score weights.
-   Volume anomaly baseline parameters.
-   Historical lookback windows.
-   Benchmark mappings.
-   Provider priorities.
-   Conflict tolerances.
-   Retry limits.
-   API rate limits where applicable.

Configuration should not require source-code changes for routine
threshold tuning.

------------------------------------------------------------------------

# 25. Testing Requirements

The implementation shall include tests for:

## Unit Tests

-   Percentage-change calculations.
-   Attention scoring.
-   Threshold boundaries.
-   Relative performance.
-   Volume anomaly calculations.
-   Freshness classification.
-   Conflict resolution.
-   Seen-state transitions.

## Integration Tests

-   Watchlist CRUD.
-   Market-data ingestion.
-   Change detection pipeline.
-   Seen-state persistence.
-   Provider failure handling.

## End-to-End Tests

At minimum:

1.  Create watchlist.
2.  Add securities.
3.  Establish baseline.
4.  Change market state.
5.  Return to application.
6.  Verify meaningful changes.
7.  Verify ranking.
8.  Verify explanation.
9.  Verify seen state update.

## Failure Tests

-   Provider timeout.
-   Provider returns malformed data.
-   Database unavailable.
-   Duplicate requests.
-   Out-of-order market events.
-   Concurrent seen-state updates.

------------------------------------------------------------------------

# 26. Demo/Submission Requirements

The system should be demonstrable without relying on unpredictable
live-market behavior.

Therefore, the implementation should support a controlled/demo data mode
or deterministic fixtures that can reproduce:

1.  Large stock-specific movement.
2.  Normal movement.
3.  Market-wide movement.
4.  Volume anomaly.
5.  Stale data.
6.  Provider failure.
7.  Last-seen comparison.

This does not replace real market-data integration; it makes the
engineering behavior reproducible during judging.

------------------------------------------------------------------------

# 27. Requirements Traceability

  -----------------------------------------------------------------------
  Product Goal                        SRS Requirements
  ----------------------------------- -----------------------------------
  Make changes obvious                FR-015 through FR-026, FR-045
                                      through FR-048

  Reduce noise                        FR-017, FR-024, FR-025, FR-026

  Explain significance                FR-027, FR-028, NFR-010

  Preserve continuity                 FR-029 through FR-034

  Build trust                         FR-011 through FR-014, FR-035
                                      through FR-039

  Handle failures                     REL-001 through REL-005

  Scale responsibly                   NFR-005, NFR-009

  Maintain correctness                NFR-001, NFR-006, DI-001 through
                                      DI-005

  Avoid over-engineering              Scope boundaries and deterministic
                                      MVP

  Demonstrate engineering depth       Reliability, concurrency, data
                                      quality, testing and observability
                                      requirements
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 28. Assumptions

1.  The challenge is being implemented as an independent prototype
    rather than as a modification of Groww's production systems.
2.  Market-data availability and licensing depend on the selected
    provider.
3.  The system will initially focus on supported Indian-market
    securities unless the implementation explicitly expands scope.
4.  Not every advanced contextual signal will be available from the
    chosen data source.
5.  The meaningful-change model is our product decision and is not
    presented as an official Groww algorithm.
6.  Performance targets should be validated through actual benchmarks
    instead of being invented as production guarantees.

------------------------------------------------------------------------

# 29. Current External-Context Notes --- September 2026

This document has been reviewed against current public Groww information
as of **04 September 2026**.

Groww's current public product surface includes stocks, ETFs, IPOs, MTF,
F&O, commodities, stock events, technical information, watchlists, and
related market functionality. This reinforces the need for our prototype
to differentiate itself through **change interpretation and
prioritization**, rather than simply reproducing a conventional
quote/watchlist interface.

Groww has also publicly introduced **GR-1**, an AI investing assistant
in August 2026 that provides contextual research around market data,
watchlists, portfolios, and company developments. Therefore, our product
should avoid positioning generic conversational AI as its primary
novelty. The stronger differentiation remains the **persistent last-seen
state + deterministic meaningful-change engine + attention
prioritization + explainable market context**.

Current public Groww materials also emphasize simplicity, transparency,
reliability, customer obsession, and long-term thinking. These
principles are consistent with keeping the implementation explainable
and avoiding unnecessary infrastructure.

These current facts are contextual references for product positioning;
they do **not** change the challenge's stated minimum requirements.

------------------------------------------------------------------------

# 30. Requirement Priorities

## P0 --- Mandatory

-   Authentication/user identity
-   Watchlist CRUD
-   Security add/remove
-   Latest market data
-   Persistent seen state
-   Current vs baseline comparison
-   Meaningful-change engine
-   Attention ranking
-   Explanation
-   Freshness status
-   Basic failure handling
-   Security/authorization

## P1 --- High Value

-   Market-relative comparison
-   Sector-relative comparison
-   Volume anomaly
-   Significant price levels
-   Multiple watchlists
-   Controlled demo mode
-   Strong observability

## P2 --- Optional

-   Event/news context
-   Custom thresholds
-   Notifications
-   Historical change timeline
-   Personalized attention preferences

------------------------------------------------------------------------

# 31. Final SRS Principle

The system is not being built to answer:

> **"What is the stock price?"**

It is being built to answer:

> ## "What meaningfully changed for this user, since they last looked, and why should they care?"

Every major technical component should be justified against that
question.

------------------------------------------------------------------------

# 32. Next Document

The next document, **`03_System_Architecture.md`**, should translate
these requirements into a concrete architecture.

It should define:

-   Architecture style.
-   Frontend architecture.
-   Backend architecture.
-   Database design.
-   Market-data ingestion.
-   Normalization layer.
-   Meaningful-change engine.
-   Last-seen state architecture.
-   Caching strategy.
-   Background processing.
-   API contracts.
-   Failure/fallback architecture.
-   Concurrency handling.
-   Scalability strategy.
-   Security boundaries.
-   Observability.
-   Deployment architecture.
-   Technology choices and their trade-offs.

The architecture should remain deliberately simple unless a more complex
component has a clearly defensible reason to exist.
