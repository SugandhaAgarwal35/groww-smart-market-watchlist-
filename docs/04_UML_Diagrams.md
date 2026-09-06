# 04 — UML Diagrams
## Smart Market Watchlist — Top-20 Submission Design

**Version:** 1.0  
**Status:** Derived from `03_System_Architecture_v2_Top20.md`  
**Purpose:** Define the structural and behavioral UML views that will guide implementation.

---

# 1. UML Strategy

The UML set is intentionally focused rather than exhaustive.

The diagrams answer the most important architectural questions:

| Diagram | Question answered |
|---|---|
| Use Case | What does the user/system need to accomplish? |
| Component | What are the major software responsibilities and boundaries? |
| Class / Domain | What core entities and relationships exist? |
| Sequence — Watchlist Snapshot | How does a user request become an intelligent snapshot? |
| Sequence — Market Ingestion | How is external market data made trustworthy? |
| Sequence — Seen State | How do we safely persist "last seen" across devices? |
| Activity — Significance Engine | How do raw changes become attention + confidence? |
| State — Seen State | What lifecycle does a user's seen baseline follow? |
| Deployment | Where do the components run? |

The diagrams should remain consistent with the architecture. In particular,
the following distinctions must remain visible:

``` text
Raw data
   ↓
Normalized data
   ↓
Trusted market state
   ↓
Context
   ↓
Change
   ↓
Significance
   ↓
Attention + Confidence
   ↓
Explanation
```

This separation is deliberate: UML is most useful when each view communicates
one architectural concern rather than attempting to show the entire system
in one giant diagram. citeturn0search1turn0search9

---

# 2. Use Case Diagram

## 2.1 Scope

The primary actor is the **User**.

The system also interacts with external market-data providers. These are
modeled as external systems rather than users.

```plantuml
@startuml
left to right direction

actor User
actor "Market Data Provider" as Provider
actor "Optional Event Provider" as EventProvider

rectangle "Smart Market Watchlist" {
  usecase "Create Watchlist" as UC1
  usecase "Rename Watchlist" as UC2
  usecase "Delete Watchlist" as UC3
  usecase "Add Security" as UC4
  usecase "Remove Security" as UC5
  usecase "Reorder Securities" as UC6

  usecase "View Watchlist Snapshot" as UC7
  usecase "View Latest Market Data" as UC8
  usecase "View Meaningful Changes" as UC9
  usecase "View Why It Matters" as UC10
  usecase "View Data Confidence" as UC11
  usecase "Mark Security as Seen" as UC12

  usecase "Ingest Market Data" as UC13
  usecase "Validate & Normalize Data" as UC14
  usecase "Detect Changes" as UC15
  usecase "Assess Significance" as UC16
  usecase "Assess Confidence" as UC17
  usecase "Generate Explanation Facts" as UC18
  usecase "Ingest Events" as UC19
}

User --> UC1
User --> UC2
User --> UC3
User --> UC4
User --> UC5
User --> UC6
User --> UC7
User --> UC8
User --> UC9
User --> UC10
User --> UC11
User --> UC12

Provider --> UC13
Provider --> UC14
EventProvider --> UC19

UC7 ..> UC8 : <<include>>
UC7 ..> UC9 : <<include>>
UC9 ..> UC10 : <<include>>
UC9 ..> UC11 : <<include>>

UC13 ..> UC14 : <<include>>
UC14 ..> UC15 : <<enable>>
UC15 ..> UC16 : <<include>>
UC16 ..> UC17 : <<include>>
UC16 ..> UC18 : <<include>>

@enduml
```

## 2.2 Key product interpretation

The most important use case is not simply:

``` text
View latest price
```

It is:

``` text
View meaningful changes since my last check
```

That use case depends on durable user state and contextual market analysis.

---

# 3. Component Diagram

## 3.1 High-Level Component View

```plantuml
@startuml
skinparam componentStyle rectangle

package "Client" {
  [React Web App] as Web
}

package "Backend API — Modular Monolith" {
  [Auth Module] as Auth
  [Watchlist Module] as Watchlist
  [Snapshot Read Module] as Snapshot
  [Seen-State Module] as Seen
  [Market Context Module] as Context
  [Signal Engine] as Signal
  [Significance Engine] as Significance
  [Confidence Engine] as Confidence
  [Explanation Engine] as Explain
  [Ranking Module] as Ranking
  [Data Quality Module] as Quality
  [Corporate Action Module] as Corporate
}

package "Background Processing" {
  [Market Data Worker] as Worker
  [Event Worker] as EventWorker
}

database "PostgreSQL" as DB
collections "Redis" as Redis

package "External Systems" {
  [Primary Market Data Provider] as Provider
  [Optional Secondary Provider] as Provider2
  [Optional Event Provider] as EventProvider
}

Web --> Auth
Web --> Watchlist
Web --> Snapshot
Web --> Seen

Snapshot --> Watchlist
Snapshot --> Seen
Snapshot --> Context
Snapshot --> Signal
Snapshot --> Significance
Snapshot --> Confidence
Snapshot --> Explain
Snapshot --> Ranking
Snapshot --> Quality

Signal --> Corporate
Significance --> Context
Significance --> Signal
Confidence --> Quality
Explain --> Significance
Ranking --> Significance
Ranking --> Confidence

Auth --> DB
Watchlist --> DB
Snapshot --> DB
Seen --> DB
Context --> DB
Signal --> DB
Significance --> DB
Confidence --> DB
Explain --> DB

Snapshot --> Redis
Context --> Redis

Worker --> Provider
Worker --> Provider2
Worker --> Quality
Worker --> DB

EventWorker --> EventProvider
EventWorker --> DB

@enduml
```

## 3.2 Architectural responsibility table

| Component | Responsibility | Must not own |
|---|---|---|
| Watchlist | Membership and ordering | Market calculations |
| Snapshot Read | Assemble a coherent response | Provider ingestion |
| Seen-State | User baseline lifecycle | Significance rules |
| Market Context | Benchmark/sector context | User personalization |
| Signal Engine | Detect measurable changes | UI wording |
| Significance Engine | Decide attention | Raw provider parsing |
| Confidence Engine | Evaluate evidence quality | Attention policy |
| Explanation Engine | Convert validated facts to explanation | Inventing causes |
| Data Quality | Freshness/conflict/integrity state | User ranking |
| Corporate Action | Comparison adjustment | General scoring |
| Worker | Ingest/process market observations | User-specific baselines |

This boundary discipline is important because component diagrams are most
useful when they expose responsibility and dependency direction rather than
implementation trivia. citeturn0search1

---

# 4. Domain Class Diagram

The domain model is intentionally centered on the product's differentiator:
**user baseline + trusted observation + contextual significance**.

```plantuml
@startuml

class User {
  +id: UUID
  +createdAt: Instant
}

class Watchlist {
  +id: UUID
  +userId: UUID
  +name: String
  +sortOrder: Int
  +createdAt: Instant
  +updatedAt: Instant
}

class WatchlistItem {
  +id: UUID
  +watchlistId: UUID
  +securityId: UUID
  +position: Int
  +addedAt: Instant
}

class Security {
  +id: UUID
  +symbol: String
  +exchange: String
  +name: String
  +sectorId: UUID
}

class Sector {
  +id: UUID
  +name: String
}

class MarketObservation {
  +id: UUID
  +securityId: UUID
  +provider: String
  +price: Decimal
  +volume: Decimal
  +observedAt: Instant
  +receivedAt: Instant
  +sourceEventId: String
  +qualityStatus: DataQualityStatus
}

class MarketSnapshot {
  +id: UUID
  +version: Long
  +generatedAt: Instant
  +marketSessionId: UUID
}

class BenchmarkObservation {
  +id: UUID
  +benchmark: String
  +returnPct: Decimal
  +observedAt: Instant
}

class SectorObservation {
  +id: UUID
  +sectorId: UUID
  +returnPct: Decimal
  +observedAt: Instant
}

class SeenState {
  +id: UUID
  +userId: UUID
  +watchlistId: UUID
  +securityId: UUID
  +baselineObservationId: UUID
  +baselinePrice: Decimal
  +baselineObservedAt: Instant
  +baselineMarketSession: UUID
  +baselineVersion: Long
  +seenAt: Instant
  +updatedAt: Instant
}

class ChangeAssessment {
  +id: UUID
  +securityId: UUID
  +baselineObservationId: UUID
  +currentObservationId: UUID
  +attentionLevel: AttentionLevel
  +attentionScore: Decimal
  +confidenceLevel: ConfidenceLevel
  +confidenceScore: Decimal
  +ruleVersion: String
}

class Signal {
  +type: SignalType
  +value: Decimal
  +unit: String
  +status: SignalStatus
}

class Evidence {
  +type: EvidenceType
  +value: String
  +sourceObservationId: UUID
  +contribution: String
}

class DataQuality {
  +freshness: FreshnessStatus
  +sourceAgreement: AgreementStatus
  +timestampValidity: Boolean
  +baselineIntegrity: Boolean
  +adjustmentIntegrity: Boolean
}

class CorporateAction {
  +id: UUID
  +securityId: UUID
  +type: String
  +effectiveAt: Instant
  +adjustmentFactor: Decimal
}

class ExplanationFact {
  +type: String
  +value: String
  +displayPriority: Int
}

enum AttentionLevel {
  HIGH
  MEDIUM
  LOW
  NONE
}

enum ConfidenceLevel {
  HIGH
  MEDIUM
  LOW
}

enum DataQualityStatus {
  TRUSTED
  DELAYED
  CONFLICTED
  INVALID
}

enum FreshnessStatus {
  FRESH
  DELAYED
  STALE
  UNKNOWN
}

enum SignalStatus {
  VALID
  NOT_AVAILABLE
  INVALID
}

User "1" -- "0..*" Watchlist
Watchlist "1" *-- "1..*" WatchlistItem
WatchlistItem "*" --> "1" Security
Security "*" --> "0..1" Sector

Security "1" -- "0..*" MarketObservation
MarketSnapshot "1" -- "1..*" MarketObservation
MarketSnapshot "1" -- "0..*" BenchmarkObservation
MarketSnapshot "1" -- "0..*" SectorObservation

User "1" -- "0..*" SeenState
Watchlist "1" -- "0..*" SeenState
Security "1" -- "0..*" SeenState
SeenState "*" --> "1" MarketObservation : baseline

Security "1" -- "0..*" ChangeAssessment
ChangeAssessment "*" --> "1" MarketObservation : current
ChangeAssessment "*" --> "1" MarketObservation : baseline
ChangeAssessment "1" *-- "1..*" Signal
ChangeAssessment "1" *-- "1..*" Evidence
ChangeAssessment "1" *-- "0..*" ExplanationFact
ChangeAssessment "1" --> "1" DataQuality

Security "1" -- "0..*" CorporateAction
CorporateAction "*" --> Security

@enduml
```

---

# 5. Important Domain Constraints

These are more important than simply drawing classes.

## 5.1 Observation identity

`MarketObservation.id` must uniquely identify the normalized observation.

``` text
Same source event
    ↓
same logical observation
```

Retries must not create duplicate effective observations.

## 5.2 Observation ordering

``` text
observedAt
    >
receivedAt
```

in terms of semantic importance.

A late network arrival must not make an older observation become the latest
effective market state.

## 5.3 Seen-state integrity

`SeenState.baselineObservationId` must point to an observation that was
actually eligible to be shown to the user.

## 5.4 Assessment reproducibility

A `ChangeAssessment` must retain enough provenance to reproduce its decision:

``` text
baseline observation
current observation
benchmark observation
sector observation
historical window
corporate-action reference
rule version
```

---

# 6. Sequence Diagram — User Opens Watchlist

This is the most important end-to-end product flow.

```plantuml
@startuml
autonumber

actor User
participant "React App" as UI
participant "Snapshot API" as API
participant "Watchlist Module" as WM
participant "Market Snapshot Store" as MS
participant "Seen-State Module" as Seen
participant "Significance Engine" as SE
participant "Confidence Engine" as CE
participant "Explanation Engine" as EE
participant "Ranking Module" as Rank
database PostgreSQL as DB
collections Redis as Cache

User -> UI: Open watchlist
UI -> API: GET /watchlists/{id}/snapshot

API -> WM: Validate access
WM -> DB: Load watchlist + memberships
DB --> WM: Watchlist items

API -> MS: Resolve current snapshot version
MS -> Cache: Read latest market snapshot
Cache --> MS: Snapshot version

API -> Seen: Load baselines for user
Seen -> DB: Read SeenState
DB --> Seen: Baselines

API -> SE: Assess changes(items, snapshot, baselines)

SE -> MS: Load trusted observations
MS --> SE: Current observations

SE -> SE: Apply corporate-action basis
SE -> SE: Detect price/volume/level changes
SE -> SE: Apply market/sector context
SE -> SE: Assess significance

SE -> CE: Assess confidence
CE --> SE: Confidence levels

SE -> EE: Build structured evidence
EE --> SE: Explanation facts

SE --> API: Assessments

API -> Rank: Rank attention + confidence
Rank --> API: Ordered results

API --> UI: Watchlist snapshot
UI --> User: Render changes + explanations + freshness

note over UI,Seen
Baseline is NOT advanced merely
because the API was called.
end note

@enduml
```

### Why this sequence matters

It demonstrates that the watchlist is not a simple CRUD screen.

The read path combines:

``` text
watchlist membership
+
consistent market snapshot
+
user baseline
+
context
+
significance
+
confidence
+
explanation
```

---

# 7. Sequence Diagram — Market Data Ingestion

The ingestion pipeline protects the product from bad external data.

```plantuml
@startuml
autonumber

participant "Market Worker" as Worker
participant "Provider Adapter" as Adapter
participant "Primary Provider" as Provider
participant "Validation" as Validation
participant "Normalizer" as Normalizer
participant "Data Quality" as Quality
participant "Corporate Action" as CA
database PostgreSQL as DB
participant "Market State" as State

Worker -> Adapter: Fetch market batch
Adapter -> Provider: Request latest observations
Provider --> Adapter: Raw observations

Adapter -> Validation: Validate schema + required fields
Validation --> Adapter: Valid / Invalid

alt Invalid data
  Adapter -> Quality: Record invalid observation
  Quality -> DB: Persist quality status
else Valid data
  Adapter -> Normalizer: Normalize symbols/timestamps/units
  Normalizer --> Adapter: Normalized observations

  Adapter -> Quality: Check freshness + timestamps
  Quality -> Quality: Check cross-source agreement

  Adapter -> CA: Check adjustment context
  CA --> Adapter: Adjustment metadata

  Adapter -> DB: Persist normalized observation
  Adapter -> State: Update effective market state

  State -> DB: Persist snapshot/version
end

@enduml
```

## 7.1 Failure behavior

```plantuml
@startuml

start

:Fetch provider data;

if (Provider available?) then (yes)
  :Validate response;
else (no)
  :Record provider failure;
  :Use last trusted state if allowed;
  :Mark freshness degraded;
  stop
endif

if (Schema valid?) then (yes)
  :Normalize observation;
else (no)
  :Reject observation;
  :Record data-quality failure;
  stop
endif

if (Timestamp valid?) then (yes)
  :Continue;
else (no)
  :Downgrade confidence;
endif

if (Conflicting source?) then (yes)
  :Persist conflict;
  :Do not silently choose;
  :Mark effective state conflicted;
else (no)
  :Accept trusted state;
endif

:Publish new market snapshot;

stop
@enduml
```

---

# 8. Sequence Diagram — Mark Security as Seen

This sequence is important because "last seen" is the product's memory.

```plantuml
@startuml
autonumber

actor User
participant "React App" as UI
participant "Seen-State API" as API
participant "Seen-State Module" as Seen
database PostgreSQL as DB

User -> UI: View security with trustworthy data
UI -> API: POST /seen
API -> Seen: Mark observation O11 as seen

Seen -> DB: Begin transaction
Seen -> DB: Load current SeenState
DB --> Seen: Baseline O10, version 7

alt Incoming observation is newer
  Seen -> DB: Conditional update\nWHERE version = 7\nAND observedAt <= O11
  DB --> Seen: Updated version 8
  Seen --> API: Success
else Incoming observation is stale
  Seen --> API: Reject stale transition
end

API --> UI: Result

@enduml
```

## 8.1 Concurrency invariant

For a security:

``` text
baselineObservedAt must never move backwards.
```

Therefore:

``` text
O10 @ 10:00
O11 @ 10:01

valid:
O10 → O11

invalid:
O11 → O10
```

---

# 9. Activity Diagram — Meaningful Change Engine

This diagram expresses the actual product intelligence.

```plantuml
@startuml

start

:Load current trusted observation;
:Load user's baseline;
:Load market snapshot;

if (Baseline exists?) then (no)
  :Classify as FIRST_VIEW;
  :Use market/historical context only;
  :Build low/neutral baseline state;
else (yes)
  :Check baseline integrity;
endif

:Check corporate-action boundary;

if (Adjustment valid?) then (yes)
  :Create adjusted comparison basis;
else (no)
  :Downgrade comparison confidence;
endif

:Calculate price change;

:Calculate market-relative move;

if (Sector context available?) then (yes)
  :Calculate sector-relative move;
else (no)
  :Mark sector signal NOT_AVAILABLE;
endif

if (Historical volume sufficient?) then (yes)
  :Calculate volume anomaly;
else (no)
  :Mark volume signal NOT_AVAILABLE;
endif

:Check significant price levels;

:Load event evidence if available;

:Aggregate evidence;

:Assess significance;

:Assess confidence;

if (Attention HIGH?) then (yes)
  :Rank near top;
else (no)
  if (Attention MEDIUM?) then (yes)
    :Rank normally;
  else (no)
    :Keep low-priority / unchanged;
  endif
endif

:Generate structured explanation facts;

stop

@enduml
```

---

# 10. State Machine — Seen State

The state machine is useful because the meaning of "seen" is subtle.

```plantuml
@startuml

[*] --> UNSEEN

UNSEEN --> VISIBLE_UNCONFIRMED : snapshot rendered
VISIBLE_UNCONFIRMED --> SEEN : client confirms view

VISIBLE_UNCONFIRMED --> UNSEEN : render failed / invalid data

SEEN --> CHANGED : newer trusted observation differs
CHANGED --> VISIBLE_UNCONFIRMED : user opens security
VISIBLE_UNCONFIRMED --> SEEN : confirmation succeeds

SEEN --> SEEN : same observation viewed again

CHANGED --> CHANGED : background market updates

note right of SEEN
Stores:
baselineObservationId
baselinePrice
baselineObservedAt
baselineVersion
end note

@enduml
```

### Important interpretation

A background refresh should not transition:

``` text
CHANGED → SEEN
```

Only a valid user-view event should do that.

---

# 11. Sequence Diagram — Conflicting Market Data

This is a resilience scenario worth demonstrating during Q&A.

```plantuml
@startuml
autonumber

participant Worker
participant "Provider A" as A
participant "Provider B" as B
participant "Conflict Resolver" as CR
participant "Data Quality" as DQ
database DB

Worker -> A: Fetch observation
A --> Worker: Price 100.00 @ T1

Worker -> B: Fetch observation
B --> Worker: Price 104.50 @ T1

Worker -> CR: Compare same security/time
CR -> DQ: Record source disagreement

DQ --> CR: CONFLICTED

CR -> DB: Persist both observations
CR -> DB: Mark effective state conflicted

CR --> Worker: Do not silently trust one source

note over DB
UI may show:
"Data conflict — confidence low"
rather than a fabricated certainty.
end note

@enduml
```

---

# 12. Sequence Diagram — Late-Arriving Observation

```plantuml
@startuml
autonumber

participant Provider
participant Worker
participant "Market State" as State
database DB

Provider -> Worker: Observation T2
Worker -> State: Process T2
State -> DB: Store T2
State -> DB: Mark T2 effective latest

Provider -> Worker: Late observation T1
Worker -> State: Process T1

State -> DB: Store T1 for history
State -> State: Compare T1.observedAt < T2.observedAt

State --> Worker: Do not replace T2

@enduml
```

The important invariant is:

``` text
effectiveLatest = max(valid observations by observedAt)
```

not:

``` text
effectiveLatest = last packet received
```

---

# 13. Sequence Diagram — Corporate Action

This flow protects against false "huge movement" alerts.

```plantuml
@startuml
autonumber

participant "Significance Engine" as SE
participant "Seen-State" as Seen
participant "Corporate Action Service" as CA
participant "Market State" as MS
database DB

SE -> Seen: Load baseline observation
Seen -> DB: O100 @ ₹100
DB --> Seen: O100

SE -> MS: Load current observation
MS -> DB: O110 @ ₹50
DB --> MS: O110

SE -> CA: Check actions between O100 and O110
CA -> DB: Load corporate actions
DB --> CA: 2:1 split @ boundary

CA --> SE: Adjustment factor = 0.5

SE -> SE: Normalize comparison basis
SE -> SE: Detect economic change

note over SE
Naive result:
-50%

Adjusted result:
approximately unchanged

The product should avoid a false HIGH alert.
end note

@enduml
```

---

# 14. Deployment Diagram

The challenge does not need a large distributed deployment.

```plantuml
@startuml

node "User Device" {
  artifact "React Web App" as React
}

cloud "Internet / HTTPS" as Internet

node "Application Environment" {
  node "Backend Runtime" {
    artifact "Modular Monolith API" as API
  }

  node "Background Worker" {
    artifact "Market Data Worker" as Worker
  }
}

database "PostgreSQL" as PG
collections "Redis" as Redis

cloud "Market Data Provider" as MarketProvider
cloud "Optional Event Provider" as EventProvider

React --> Internet
Internet --> API : HTTPS

API --> PG : SQL
API --> Redis : cache / rate limit

Worker --> MarketProvider : HTTPS
Worker --> EventProvider : HTTPS
Worker --> PG : SQL

@enduml
```

## 14.1 Deployment rationale

The architecture deliberately avoids:

``` text
Kubernetes
Kafka
multiple microservices
distributed event buses
```

for the initial build.

The product's engineering depth comes from:

``` text
correct state
+
correct market data handling
+
deterministic significance
+
resilience
+
traceability
```

rather than infrastructure complexity.

---

# 15. Data Flow Diagram

Although not strictly required as a UML diagram, this view is useful for
implementation alignment.

```text
                  EXTERNAL WORLD
                        │
                        ▼
               ┌────────────────┐
               │ Provider Adapter│
               └───────┬────────┘
                       │ raw
                       ▼
               ┌────────────────┐
               │   Validation   │
               └───────┬────────┘
                       │
                       ▼
               ┌────────────────┐
               │  Normalization │
               └───────┬────────┘
                       │
                       ▼
               ┌────────────────┐
               │  Data Quality  │
               └───────┬────────┘
                       │
                       ▼
               ┌────────────────┐
               │ Trusted Market │
               │     State      │
               └───────┬────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
      Benchmark      Sector     Historical
       Context       Context     Context
          │            │            │
          └────────────┼────────────┘
                       ▼
               ┌────────────────┐
               │ Change Signals │
               └───────┬────────┘
                       ▼
               ┌────────────────┐
               │ Significance    │
               └───────┬────────┘
                       │
               ┌───────┴────────┐
               ▼                ▼
          Attention         Confidence
               │                │
               └───────┬────────┘
                       ▼
               ┌────────────────┐
               │    Evidence    │
               └───────┬────────┘
                       ▼
               ┌────────────────┐
               │  Explanation   │
               └───────┬────────┘
                       ▼
                 USER SNAPSHOT
                       ▲
                       │
               ┌───────┴────────┐
               │  User Baseline │
               │   / SeenState  │
               └────────────────┘
```

---

# 16. API Interaction View

## Read path

```text
GET /watchlists/{id}/snapshot
        │
        ├── authorization
        ├── watchlist membership
        ├── snapshot version
        ├── trusted market state
        ├── user SeenState
        ├── ChangeAssessment
        ├── confidence
        ├── evidence
        └── ranking
                │
                ▼
        coherent JSON response
```

## Seen path

```text
POST /watchlists/{id}/items/{securityId}/seen
        │
        ├── authenticate
        ├── validate membership
        ├── validate observation
        ├── compare baseline version
        ├── reject stale transition
        └── atomic update
```

---

# 17. UML-to-Implementation Mapping

| UML element | Implementation module |
|---|---|
| User | `user` |
| Watchlist | `watchlist` |
| WatchlistItem | `watchlist` |
| Security | `security` / reference data |
| MarketObservation | `market-data` |
| MarketSnapshot | `market-state` |
| BenchmarkObservation | `market-context` |
| SectorObservation | `market-context` |
| SeenState | `seen-state` |
| Signal | `signal-engine` |
| ChangeAssessment | `significance-engine` |
| Evidence | `significance-engine` |
| DataQuality | `data-quality` |
| CorporateAction | `corporate-action` |
| ExplanationFact | `explanation` |

Recommended backend structure:

```text
src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── watchlists/
│   ├── securities/
│   ├── market-data/
│   ├── market-state/
│   ├── market-context/
│   ├── seen-state/
│   ├── signal-engine/
│   ├── significance-engine/
│   ├── confidence-engine/
│   ├── data-quality/
│   ├── corporate-action/
│   ├── explanation/
│   └── ranking/
│
├── workers/
│   ├── market-ingestion.worker.ts
│   └── event-ingestion.worker.ts
│
├── infrastructure/
│   ├── postgres/
│   ├── redis/
│   └── providers/
│
└── shared/
    ├── errors/
    ├── types/
    └── utils/
```

---

# 18. Critical Invariants

These invariants should become automated tests.

## INV-001 — Baseline monotonicity

```text
new baseline observedAt >= existing baseline observedAt
```

## INV-002 — Effective observation ordering

```text
latest effective observation =
max(valid observations by observedAt)
```

## INV-003 — No false confidence

```text
conflicted/stale/invalid evidence
    → cannot produce HIGH confidence
```

## INV-004 — Explanation provenance

```text
Every explanation fact
    → references a validated signal/evidence source.
```

## INV-005 — No unsupported context

```text
Missing sector/benchmark/history
    → NOT_AVAILABLE
not
    → fabricated zero / penalty.
```

## INV-006 — Corporate-action safety

```text
Price comparison crossing an adjustment boundary
    → adjusted comparison or downgraded confidence.
```

## INV-007 — User-state semantics

```text
Background refresh
    ≠
User saw the security.
```

## INV-008 — Snapshot coherence

```text
A watchlist response should not silently combine
incompatible market-state versions.
```

---

# 19. Top-20 Demo Scenarios Mapped to UML

| Demo scenario | Diagram to explain |
|---|---|
| User returns after several hours | User Snapshot Sequence |
| One stock moves much more than market | Activity + Context |
| Market-wide crash | Market Context + Significance |
| Volume spike | Activity |
| User opens on two devices | Seen-State Sequence |
| Older packet arrives late | Late Observation Sequence |
| Provider data conflicts | Conflict Sequence |
| Stock split occurs | Corporate Action Sequence |
| Market data is delayed | Ingestion + Confidence |
| Why is this marked HIGH? | Domain Class + Evidence |
| Why should I trust this alert? | Confidence + Provenance |
| Scale to many users | Component + Precomputation |

---

# 20. Recommended Diagram Presentation Order

For the final project documentation or presentation, use this order:

### 1. Component Diagram

Start with the architecture.

### 2. User Snapshot Sequence

Show the core product flow.

### 3. Domain Class Diagram

Show the state and entities that make the flow possible.

### 4. Significance Activity Diagram

Show the intelligence behind the product.

### 5. Seen-State Sequence

Show the unique "since your last check" architecture.

### 6. Resilience Sequences

Use conflict, late data, and corporate action examples during Q&A.

### 7. Deployment Diagram

Finish with the deliberately simple infrastructure.

This ordering tells a much stronger story than presenting generic UML diagrams
one after another.

---

# 21. Architecture Traceability

```text
PRD
 │
 ├── "since last check"
 │       ↓
 │    SeenState
 │
 ├── meaningful change
 │       ↓
 │    Signal + Significance
 │
 ├── market context
 │       ↓
 │    Benchmark/Sector Context
 │
 ├── reliability
 │       ↓
 │    DataQuality + Confidence
 │
 └── explanation
         ↓
      Evidence + ExplanationFact

SRS
 │
 ├── FR Watchlist
 │       ↓
 │    Watchlist Module
 │
 ├── FR Market Data
 │       ↓
 │    Market Worker + Market State
 │
 ├── FR Change Detection
 │       ↓
 │    Signal Engine
 │
 ├── FR Significance
 │       ↓
 │    Significance Engine
 │
 ├── FR Last Seen
 │       ↓
 │    Seen-State Module
 │
 └── NFR Reliability
         ↓
      Quality + Ordering + Concurrency
```

---

# 22. Final UML Design Decision

The UML model intentionally emphasizes the areas that make the project
different from a generic watchlist:

```text
                USER
                 │
                 ▼
          ┌─────────────┐
          │  SeenState  │
          └──────┬──────┘
                 │ baseline
                 ▼
       ┌────────────────────┐
       │ Current Market     │
       │ Observation        │
       └─────────┬──────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
   Market Context    Historical Context
        │                 │
        └────────┬────────┘
                 ▼
          ┌─────────────┐
          │   Signals   │
          └──────┬──────┘
                 ▼
       ┌──────────────────┐
       │  Significance    │
       └────────┬─────────┘
                │
          ┌─────┴─────┐
          ▼           ▼
      Attention    Confidence
          │           │
          └─────┬─────┘
                ▼
          ┌───────────┐
          │ Evidence  │
          └─────┬─────┘
                ▼
         Explanation
                │
                ▼
              USER
```

The implementation should preserve this conceptual model even if individual
classes, endpoints, or framework details change.

The goal is not to have the most UML diagrams. The goal is for every diagram
to reinforce a real architectural decision. Focused class, sequence,
component, activity, and deployment views are generally more useful than
over-modeling the system. citeturn0search0turn0search4
