# Smart Market Watchlist — Code by Groww 2026

> **"What meaningfully changed in my watchlist since I last checked, and what deserves my attention now?"**

The Smart Market Watchlist transforms the conventional stock watchlist from a passive price board into an intelligent, contextual awareness engine. It establishes a durable baseline when you check your stocks, tracks market and sector context, calculates relative movements and volume anomalies, filters out market-wide noise and corporate actions, and delivers ranked, fact-grounded explanations.

---

## 1. System Architecture & Evaluation Pipeline

The system is built as a **modular monolith** with an asynchronous market-data ingestion worker, PostgreSQL durable persistence, Redis caching support, and a React + TypeScript frontend.

```text
                  ┌──────────────────────────────────────────────┐
                  │              External Market Feed            │
                  └──────────────────────┬───────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │              Provider Adapter                │
                  │   Fetch → Validate → Normalize → Deduplicate │
                  └──────────────────────┬───────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │              Trusted Market State            │
                  │         Monotonic Snapshots (v1, v2...)      │
                  └──────────────┬───────────────┬───────────────┘
                                 │               │
                 ┌───────────────┴───┐       ┌───┴───────────────┐
                 ▼                   ▼       ▼                   ▼
             Benchmark             Sector   Historical       Corporate
              Context             Context    Volume           Actions
                 │                   │          │                │
                 └───────────────┬───┴──────────┴────────────────┘
                                 ▼
                  ┌──────────────────────────────────────────────┐
                  │          Pure Signal Engine (No I/O)         │
                  │ Price Move │ Benchmark Rel │ Sector Rel │ Vol│
                  └──────────────────────┬───────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │             Significance Engine              │
                  │    Calculates Attention: HIGH / MED / LOW    │
                  └──────────────────────┬───────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │              Confidence Engine               │
                  │  Quality Status │ Freshness │ Baseline Valid │
                  └──────────────────────┬───────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │      Durable Evidence & Explanation          │
                  │   change_assessments & assessment_evidence   │
                  └──────────────────────┬───────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │     User Seen-State (Optimistic Locking)     │
                  │     Versioned baseline advancing atomically  │
                  └──────────────────────────────────────────────┘
```

---

## 2. Quickstart Guide

### Option A: 1-Click Production Setup (Docker Compose)

The entire stack (PostgreSQL, Redis, API, and Web with Nginx) can be started with a single command:

```bash
docker compose up --build
```

- **Frontend Application**: `http://localhost:8080`
- **Backend API**: `http://localhost:3000/api/v1`
- **Health Endpoint**: `http://localhost:3000/api/v1/health`

### Option B: Local Development Setup

#### Prerequisites
- Node.js 22 LTS
- PostgreSQL 16+ running locally on port 5432

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Configure Environment
Create `.env` in the project root:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/watchlist
JWT_SECRET=your-secret-key-smart-watchlist-2026-groww
WEB_ORIGIN=http://localhost:5173
MARKET_DATA_PROVIDER=demo
```

#### 3. Run Database Migrations & Seed Data
```bash
npm run migrate
npm run seed
```

#### 4. Run Automated Test Suite
```bash
npm test
```
*Executes all 23 unit, engine, and end-to-end integration tests.*

#### 5. Start Development Servers
```bash
npm run dev
```
- API server: `http://localhost:3000`
- Vite frontend: `http://localhost:5173`

---

## 3. Demo Scenarios Walkthrough

Use the scenario dropdown in the top navbar to simulate realistic market conditions:

| Scenario | Market Conditions | System Attention | System Confidence | Why It Matters |
|---|---|---|---|---|
| **1. Big Move** | INFY crashes -5.1% while NIFTY drops only -0.95% with 2.4× volume | **HIGH** | **HIGH** | Highlights security-specific divergence from broad market. |
| **2. Market-Wide Drop** | NIFTY plunges -4.85%, all stocks fall ~5% | **MEDIUM** | **HIGH** | Dampens attention because the move is market-wide, not idiosyncratic. |
| **3. Volume Spike** | RELIANCE trades at 3.2× normal baseline with +1.8% price move | **MEDIUM** | **HIGH** | Flags unusual institutional accumulation without price overreaction. |
| **4. Delayed Feed** | Observation timestamps are >15 minutes old | **LOW** | **DELAYED / LOW** | Degrades confidence score; prevents acting on stale data. |
| **5. Provider Conflict** | Contradictory quote feeds detected (+4% mismatch) | **HIGH** | **LOW** | Alerts user to anomaly while explicitly warning data is untrusted. |
| **6. Corporate Action** | TCS executes 2:1 stock split | **LOW** | **HIGH** | 0.5 adjustment factor prevents naive 50% price drop from triggering false panic. |
| **7. Normal Trading** | Quiet market with tiny fluctuations (±0.4%) | **LOW / NONE** | **HIGH** | Zero noise; highlights only securities that truly changed. |
| **8. Late Arrival** | Out-of-order market packet arrives | **NONE** | **HIGH** | Pipelines order by `observed_at`, preserving monotonic timeline. |

---

## 4. Key Architectural Decisions

1. **Deterministic Rule Engine over Black-Box LLMs**:
   Financial intelligence requires strict auditability, zero hallucinations, and sub-millisecond evaluation latency. Every attention score is traceable to concrete signals persisted in `assessment_evidence`.
2. **Optimistic Concurrency on Seen-State**:
   User baselines increment monotonically with `baseline_version`. Concurrent tabs or stale reads are rejected with HTTP `409 Conflict`, preventing baseline regressions.
3. **Monotonic Market Snapshots**:
   Observations across instruments are grouped into discrete snapshot versions (`v1`, `v2`, `v3`). Comparisons use identical market session windows.
4. **Resilient Degradation**:
   Missing sector or benchmark data degrades confidence scores but never crashes the watchlist read model.

---

## 5. API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/login` | Authenticate user and receive JWT token |
| `GET` | `/api/v1/watchlists` | List all watchlists for authenticated user |
| `GET` | `/api/v1/watchlists/:id/snapshot` | **Hero Endpoint**: Get evaluated snapshot with ranked attention |
| `POST` | `/api/v1/watchlists/:id/items/:secId/seen` | Advance user seen-state baseline (optimistic lock) |
| `POST` | `/api/v1/watchlists/:id/seen-all` | Batch advance all seen items in a watchlist |
| `GET` | `/api/v1/securities/search?q=:query` | Search securities across symbol and name |
| `POST` | `/api/v1/watchlists/demo/scenario` | Switch active market scenario and trigger auto-ingestion |
| `GET` | `/api/v1/health/ready` | Database readiness probe |

---

## 6. Verification Checklist

- [x] Full test suite passes: `npm test` (23 tests across 7 suites)
- [x] TypeScript builds clean: `npx tsc` (0 errors)
- [x] Security headers and rate limiting active (`@fastify/helmet`, `@fastify/rate-limit`)
- [x] Graceful process shutdown on `SIGTERM` / `SIGINT`
- [x] Docker multi-stage containerization ready (`docker compose up`)
- [x] Audit trail persisted to `change_assessments` and `assessment_evidence`
