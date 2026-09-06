# 01 --- Product Requirements Document (PRD)

# Smart Market Watchlist

**Project:** Code by Groww 2026\
**Challenge:** Build a Smart Market Watchlist\
**Document:** Product Requirements Document\
**Version:** 1.0\
**Status:** Proposed / Engineering Challenge Submission

------------------------------------------------------------------------

## 1. Product Overview

### 1.1 Product Name

**Smart Market Watchlist**

### 1.2 One-Line Product Definition

A market watchlist that does more than display prices: it remembers what
the user last saw, detects meaningful changes, explains why they matter,
and helps the user decide what deserves attention now.

### 1.3 Product Vision

> **Turn a passive watchlist into an intelligent market briefing.**

Traditional watchlists require users to repeatedly scan prices, charts,
news, and statistics to determine whether anything important happened.

Our product reverses that interaction.

Instead of asking:

> "What are the prices of my stocks?"

the product should answer:

> **"What meaningfully changed in the stocks I care about since I last
> checked, and what should I pay attention to?"**

------------------------------------------------------------------------

# 2. Challenge Context

Groww's Code 2026 challenge asks participants to build a Smart Market
Watchlist.

At minimum, users must be able to:

-   Create and manage a watchlist
-   View latest market information
-   Return later and understand what has changed

The challenge intentionally leaves important decisions open:

-   What constitutes a meaningful change
-   What information should be surfaced
-   How state persists across sessions/devices
-   How stale, delayed, or conflicting data is handled
-   How the system scales
-   Where to keep the solution simple versus adding complexity

Therefore, the product is evaluated not only on feature completeness but
also on **product judgement and engineering thoughtfulness**.

------------------------------------------------------------------------

# 3. Problem Statement

## 3.1 User Problem

A conventional watchlist gives users information but makes the user do
the interpretation.

For example:

``` text
RELIANCE    ₹1,421.30   +2.1%
TCS         ₹3,984.50   -1.4%
INFY        ₹1,512.20   +0.8%
HDFCBANK    ₹1,024.60   -0.2%
```

The user still has to determine:

-   Is the movement unusual?
-   Did it happen recently?
-   Is the entire market moving?
-   Is the stock behaving differently from its sector?
-   Is there an important event?
-   Is this merely normal noise?
-   Which stock deserves attention first?

The problem is therefore not lack of data.

The problem is **lack of useful interpretation**.

## 3.2 Product Opportunity

We can create value by transforming raw market information into:

``` text
Raw Data
   ↓
Change Detection
   ↓
Meaningfulness Assessment
   ↓
Context
   ↓
Prioritization
   ↓
Human-readable Explanation
```

The product should reduce the time and cognitive effort required to
understand a user's watchlist.

------------------------------------------------------------------------

# 4. Product Goals

## Primary Goals

### Goal 1 --- Make changes obvious

A user should immediately understand which watched stocks changed
meaningfully since their previous check.

### Goal 2 --- Reduce noise

Small or routine market movements should not overwhelm the user.

### Goal 3 --- Explain significance

The product should provide context rather than merely displaying a
number.

### Goal 4 --- Preserve continuity

The system should remember the user's previous viewing state so that
returning later produces a meaningful "since you last checked"
experience.

### Goal 5 --- Build trust

Market information must clearly communicate freshness, source status,
and uncertainty where relevant.

### Goal 6 --- Demonstrate engineering depth

The product should be architected so that reliability, correctness,
scalability, and failure handling are first-class concerns.

------------------------------------------------------------------------

# 5. Non-Goals

The initial product is **not** intended to be:

-   A complete trading terminal
-   A brokerage/order-execution platform
-   A portfolio-management replacement
-   A personalized investment-advice engine
-   A prediction engine that claims to forecast stock prices
-   A high-frequency trading system
-   A replacement for professional market terminals
-   A generic news aggregation platform

We should avoid adding functionality merely to increase feature count.

The core problem remains:

> **Understand what meaningfully changed in my watchlist.**

------------------------------------------------------------------------

# 6. Target Users

## Primary User

An individual market participant who follows multiple stocks and wants
to stay informed without continuously monitoring the market.

Typical characteristics:

-   Tracks multiple securities
-   Checks markets periodically rather than continuously
-   Wants concise information
-   May understand basic market terminology
-   Does not want to manually compare every metric after every visit

## Secondary User

A more active investor who tracks a larger watchlist and needs faster
prioritization.

Their primary need is:

> "Tell me what deserves my attention first."

------------------------------------------------------------------------

# 7. User Personas

## Persona A --- Periodic Investor

**Behavior**

-   Checks the market once or twice a day
-   Tracks 10--30 stocks
-   Wants a quick summary
-   Doesn't want dozens of alerts

**Pain Point**

By the time they return, they cannot easily remember what changed.

**Product Need**

A clear "Since your last visit" summary.

------------------------------------------------------------------------

## Persona B --- Active Watcher

**Behavior**

-   Tracks many stocks
-   Checks markets several times during the day
-   Looks for unusual movements
-   Wants more context

**Pain Point**

There is too much information to manually scan.

**Product Need**

Ranking and prioritization of meaningful events.

------------------------------------------------------------------------

# 8. Core User Journey

``` text
1. User opens Smart Market Watchlist
              ↓
2. Creates or selects a watchlist
              ↓
3. Adds stocks
              ↓
4. Views current market state
              ↓
5. User leaves
              ↓
6. System records the relevant viewed state
              ↓
7. Market conditions change
              ↓
8. User returns later
              ↓
9. System compares current state with user's last-seen state
              ↓
10. Meaningful changes are detected
              ↓
11. Changes are ranked by importance
              ↓
12. User sees concise explanations
              ↓
13. User drills into a stock if desired
              ↓
14. New state becomes the user's reference point
```

------------------------------------------------------------------------

# 9. Core Product Experience

The primary screen should answer three questions immediately:

### 1. What changed?

Example:

> **3 meaningful changes since your last visit**

### 2. Why does it matter?

Example:

> INFY is down 5.2%, significantly below its recent trading range.

### 3. What should I look at first?

Example:

> **High attention:** INFY\
> **Medium attention:** TCS\
> **Low attention:** RELIANCE

The interface should prioritize information rather than force the user
to inspect every row.

------------------------------------------------------------------------

# 10. Definition of "Meaningful Change"

This is the central product decision.

A meaningful change is **not simply any price movement**.

A change becomes meaningful when it is sufficiently unusual, material,
or contextually important relative to the user's last observation.

## 10.1 Initial Change Signals

The system should consider multiple signals.

### Signal A --- Price Movement

Examples:

-   Absolute percentage movement
-   Movement since last check
-   Intraday movement
-   Gap from previous close

### Signal B --- Relative Movement

Compare the stock against:

-   Broad market benchmark
-   Relevant sector benchmark

Example:

``` text
Stock:       -4.5%
Market:      -0.8%

Relative move: -3.7%
```

A stock-specific move may therefore receive higher attention than a
market-wide decline.

### Signal C --- Volume Anomaly

Compare current volume with an appropriate historical baseline.

Example:

``` text
Today's volume:       2.4× typical volume
Price movement:      +3.8%
```

This combination is more informative than price movement alone.

### Signal D --- Significant Price Levels

Examples:

-   New 52-week high
-   New 52-week low
-   Large move from recent range
-   Breakout/breakdown relative to defined reference levels

### Signal E --- Event Signals

Where reliable data is available:

-   Earnings
-   Corporate actions
-   Dividends
-   Stock splits
-   Major announcements

### Signal F --- Data Quality

A change should not be treated as meaningful if it is likely caused by
bad or stale data.

------------------------------------------------------------------------

# 11. Meaningfulness Model

The first implementation should use a **transparent rule-based scoring
model**, rather than an opaque ML model.

## Example Concept

``` text
Meaningfulness Score =
    Price Movement Score
  + Relative Movement Score
  + Volume Anomaly Score
  + Significant-Level Score
  + Event Score
  - Data Quality Penalty
```

The exact weights and thresholds should be configurable.

### Example

``` text
INFY

Price move:          -4.8%       → strong
Market-relative:     -3.9%       → strong
Volume anomaly:       2.1×       → moderate
52-week level:        none       → none

Final attention: HIGH
```

The user should not need to understand the internal formula to use the
product, but the team should be able to explain it during evaluation.

------------------------------------------------------------------------

# 12. Attention Levels

The system should classify meaningful changes into three simple levels.

## High Attention

Changes that are unusually large or supported by multiple independent
signals.

Example:

> **INFY --- High attention**\
> Down 5.1% since you last checked, while the sector is down only 0.9%.
> Trading volume is 2.3× its recent average.

## Medium Attention

A noticeable change that deserves awareness but does not indicate an
exceptional event.

## Low Attention

A change that is technically different but unlikely to matter.

Low-attention changes may be grouped rather than prominently displayed.

------------------------------------------------------------------------

# 13. Explainability

Every surfaced change should answer:

### What happened?

``` text
INFY fell 5.1%.
```

### When did it happen?

``` text
Since your last check: 6h 24m
```

### Is it unusual?

``` text
This move is significantly larger than its recent typical movement.
```

### Is the market doing the same thing?

``` text
NIFTY IT: -1.2%
INFY:      -5.1%
```

### Why should I care?

``` text
INFY is materially underperforming its sector today.
```

The product should avoid unsupported claims such as:

> "INFY will continue falling."

We describe observed information rather than pretending to predict the
future.

------------------------------------------------------------------------

# 14. Last-Seen State

The "since you last checked" experience requires persistent state.

## 14.1 What should be remembered?

At minimum:

-   User
-   Watchlist
-   Security
-   Last relevant market snapshot
-   Last viewed timestamp
-   Version/reference of the displayed state

## 14.2 Important Distinction

The system should distinguish between:

### Market state

What the market was doing.

### User-seen state

What the user actually had an opportunity to see.

This distinction prevents incorrect statements such as:

> "Nothing changed since you last checked"

when the user technically opened the application but never viewed the
relevant watchlist.

------------------------------------------------------------------------

# 15. Watchlist Management

Users should be able to:

### Create

Create a named watchlist.

### Add

Add supported securities.

### Remove

Remove securities.

### Reorder

Optionally reorder securities according to user preference.

### Rename

Rename a watchlist.

### Switch

Switch between multiple watchlists if supported.

The MVP should keep watchlist management simple and reliable.

------------------------------------------------------------------------

# 16. Latest Market Information

For each security, the system should provide relevant information such
as:

-   Current/latest price
-   Absolute change
-   Percentage change
-   Previous close
-   Timestamp
-   Market/session status
-   Data freshness
-   Selected contextual metrics

The product should avoid displaying every available metric.

Information should be selected based on its usefulness in answering:

> "What changed?"

------------------------------------------------------------------------

# 17. Market Data Freshness

Trust is critical.

Every market-data response should have a freshness state.

## Example States

### Live / Current

Data is within the expected freshness window.

### Delayed

Data is available but older than the normal expected update interval.

### Stale

Data has exceeded the maximum acceptable age.

### Unavailable

No trustworthy current data is available.

The UI should never imply live accuracy when the system knows the data
is stale.

------------------------------------------------------------------------

# 18. Conflicting Data

If multiple data sources are used, conflicting values must not silently
overwrite one another.

The system should define:

1.  Source priority
2.  Timestamp comparison
3.  Validation rules
4.  Fallback behavior
5.  Error handling

Example:

``` text
Provider A:
₹1,245.20 at 10:31:04

Provider B:
₹1,248.90 at 10:28:51
```

The newer trustworthy observation should normally take precedence.

If the conflict exceeds a reasonable tolerance, the system should flag
the data rather than confidently presenting a potentially incorrect
change.

------------------------------------------------------------------------

# 19. User Experience Principles

## Principle 1 --- Attention over information

Show what matters first.

## Principle 2 --- Explain, don't overwhelm

Every important change should have understandable context.

## Principle 3 --- Trust before cleverness

A stale but clearly labelled value is preferable to a misleading "live"
value.

## Principle 4 --- Progressive disclosure

Summary first; detailed information on demand.

## Principle 5 --- Avoid alert fatigue

Not every price movement deserves attention.

## Principle 6 --- Be transparent

The user should be able to understand why a change was highlighted.

## Principle 7 --- Keep the primary workflow fast

A user returning after several hours should understand their watchlist
within seconds.

------------------------------------------------------------------------

# 20. MVP Feature Set

The MVP should include:

### Watchlist

-   Create watchlist
-   Add security
-   Remove security
-   View watchlist
-   Persist watchlist

### Market Data

-   Latest price
-   Price change
-   Percentage change
-   Timestamp
-   Data freshness indicator

### Change Detection

-   Store user-seen state
-   Compare current state with previous state
-   Detect meaningful price changes
-   Calculate relative market movement
-   Identify unusually large movements

### Smart Summary

-   "Since your last check"
-   Number of meaningful changes
-   Attention ranking
-   Human-readable explanation

### Reliability

-   API failure handling
-   Stale-data handling
-   Graceful empty/error states

------------------------------------------------------------------------

# 21. Advanced Features

These should only be implemented if the MVP is stable.

Possible additions:

-   Volume anomaly detection
-   Sector-relative performance
-   52-week high/low detection
-   Earnings/event awareness
-   Corporate actions
-   Custom user thresholds
-   Multiple watchlists
-   Historical change timeline
-   Change categories
-   Notifications
-   Daily market briefing
-   Personalized attention preferences

The team should explicitly justify every additional feature.

------------------------------------------------------------------------

# 22. What We Should NOT Build First

To protect the 72-hour development window, the initial implementation
should avoid:

-   Complex machine-learning models
-   Predictive stock-price models
-   Real-time trading
-   Portfolio accounting
-   Social feeds
-   Complex recommendation engines
-   Excessive microservices
-   Unnecessary event infrastructure
-   Large-scale notification systems before the core experience works

The principle is:

> **Build the smallest system that convincingly solves the actual
> problem.**

------------------------------------------------------------------------

# 23. Edge Cases

The product must account for:

## User-Level

-   New user
-   Empty watchlist
-   First visit
-   Returning after a long period
-   Multiple sessions
-   Multiple devices
-   Duplicate securities
-   Deleted watchlist

## Market-Level

-   Market closed
-   Market opening
-   Market holiday
-   Security halted
-   Security suspended
-   Corporate action
-   Large gap
-   Extremely volatile movement

## Data-Level

-   Missing data
-   Delayed data
-   Stale data
-   Conflicting providers
-   Duplicate events
-   Out-of-order updates
-   Provider outage
-   Partial response
-   Invalid values

## System-Level

-   Database failure
-   Cache failure
-   API timeout
-   Concurrent updates
-   Race conditions
-   Partial service failure

------------------------------------------------------------------------

# 24. Success Metrics

Because this is an engineering challenge rather than a production
launch, metrics should demonstrate whether the product solves the
intended problem.

## Primary Metrics

### Time to Insight

How quickly can a returning user identify the most important change?

### Meaningful Change Precision

Percentage of surfaced changes that users would consider worth noticing.

### Noise Rate

Percentage of surfaced alerts/changes that are routine or irrelevant.

### State Accuracy

Percentage of "since last check" comparisons that correctly reflect the
user's last-seen state.

### Data Freshness

Percentage of displayed market information within the expected freshness
window.

------------------------------------------------------------------------

# 25. Product Quality Metrics

We should also track:

-   API response latency
-   Error rate
-   Market-data failure rate
-   Cache hit rate where applicable
-   Change-detection processing latency
-   Database query performance
-   Successful watchlist persistence
-   Duplicate-event rate

These metrics connect product quality to engineering quality.

------------------------------------------------------------------------

# 26. Competitive Differentiation

The product should not compete by having more numbers.

A conventional watchlist answers:

> **"What is the stock price?"**

Our product answers:

> **"What changed since I last looked, how unusual is it, and what
> deserves my attention?"**

### Traditional Watchlist

``` text
Stock
Price
% Change
Chart
```

### Smart Market Watchlist

``` text
What changed?
      ↓
Was it meaningful?
      ↓
Is it unusual?
      ↓
How does it compare with the market?
      ↓
Why does it matter?
      ↓
What deserves attention first?
```

This is the core product differentiation.

------------------------------------------------------------------------

# 27. Example User Scenarios

## Scenario 1 --- Routine movement

``` text
TCS
+0.6% since last check
```

The system determines this is normal movement.

### Result

Do not prominently surface it as a major event.

------------------------------------------------------------------------

## Scenario 2 --- Significant stock-specific move

``` text
INFY
-5.2% since last check

NIFTY IT
-1.1%

Volume
2.3× recent average
```

### Result

``` text
HIGH ATTENTION

INFY is down 5.2% since your last check,
significantly underperforming its sector.
Trading volume is also unusually high.
```

------------------------------------------------------------------------

## Scenario 3 --- Market-wide decline

``` text
HDFCBANK
-3.2%

NIFTY BANK
-3.0%
```

### Result

The system should recognize that the movement is largely sector-wide
rather than automatically implying a stock-specific anomaly.

------------------------------------------------------------------------

## Scenario 4 --- Stale data

``` text
RELIANCE
₹1,420.40

Data last updated:
47 minutes ago
```

### Result

The UI should clearly indicate that the value is stale/delayed and
should not confidently generate a fresh-market conclusion from it.

------------------------------------------------------------------------

# 28. Demo Strategy

The product should be designed around a compelling 5-minute
demonstration.

## Demo Flow

### Step 1 --- Add stocks

Create a watchlist containing several securities.

### Step 2 --- Establish baseline

Show the initial market state.

### Step 3 --- Simulate or ingest changes

Introduce:

-   Large stock-specific movement
-   Normal movement
-   Market-wide movement
-   Volume anomaly
-   Stale data condition

### Step 4 --- Return to the application

Show:

> **"Since your last check"**

### Step 5 --- Show prioritization

Demonstrate that the product does not simply list every change.

### Step 6 --- Explain one event

Show:

-   What changed
-   When
-   Relative context
-   Why it was considered meaningful
-   Data freshness

### Step 7 --- Demonstrate resilience

Briefly show behavior when a data source becomes unavailable or stale.

This demo directly maps to the judging criteria.

------------------------------------------------------------------------

# 29. Engineering Principles Derived From the Product

The PRD establishes several engineering requirements for later
documents.

## Requirement 1

The architecture must preserve **user-seen state** reliably.

## Requirement 2

Market data should be normalized before meaningful-change calculations.

## Requirement 3

Change detection should be deterministic and explainable in the first
version.

## Requirement 4

Data freshness must be part of the data model, not merely a UI
decoration.

## Requirement 5

External market-data dependencies must be treated as unreliable.

## Requirement 6

The system must prevent duplicate or out-of-order market events from
corrupting state.

## Requirement 7

The system should support scaling watchlists without requiring the
frontend to perform expensive calculations.

## Requirement 8

The architecture should remain simpler than necessary rather than more
complicated than necessary.

------------------------------------------------------------------------

# 30. Product Trade-offs

## Trade-off A --- Simplicity vs intelligence

A transparent rule-based model is preferred initially over an opaque ML
model.

**Decision:** Start deterministic and explainable.

------------------------------------------------------------------------

## Trade-off B --- More data vs faster understanding

Displaying every metric increases cognitive load.

**Decision:** Surface only information that contributes to
meaningful-change interpretation.

------------------------------------------------------------------------

## Trade-off C --- Real-time complexity vs usefulness

True real-time infrastructure can add substantial engineering
complexity.

**Decision:** Build freshness-aware market updates appropriate to the
challenge rather than implementing infrastructure that does not
materially improve the core user experience.

------------------------------------------------------------------------

## Trade-off D --- More alerts vs fewer useful alerts

Aggressive alerting creates noise.

**Decision:** Optimize for attention quality rather than alert quantity.

------------------------------------------------------------------------

## Trade-off E --- Microservices vs maintainability

Separating every component into a service may make a 72-hour project
harder to reason about.

**Decision:** Prefer a modular architecture with clear boundaries;
introduce separate services only when there is a concrete need.

------------------------------------------------------------------------

# 31. Open Product Questions

The following questions should be resolved before final architecture and
implementation:

1.  Which market-data provider(s) will be used?
2.  Which securities/markets are supported?
3.  What exact thresholds define meaningful price movement?
4.  What historical baseline should be used for anomaly detection?
5.  How should market-relative movement be calculated?
6.  What constitutes an "attention-worthy" event?
7.  How long should last-seen state remain relevant?
8.  What happens if a user returns after several weeks?
9.  What happens when a user opens the same watchlist on two devices?
10. Should merely opening a watchlist update last-seen state?
11. When exactly is a stock considered "seen"?
12. How should corporate actions affect price comparisons?
13. How should market holidays affect "since last check"?
14. What data should be available when the market is closed?
15. How should conflicting providers be reconciled?
16. Which advanced features justify their engineering cost?

These should be resolved in the SRS and Architecture documents.

------------------------------------------------------------------------

# 32. Scope Definition

## Must Have

-   Watchlist management
-   Latest market information
-   Persistent state
-   Last-seen comparison
-   Meaningful-change detection
-   Attention prioritization
-   Explanation/context
-   Freshness indicators
-   Basic resilience

## Should Have

-   Market-relative comparison
-   Volume anomaly
-   Significant price levels
-   Multiple watchlists
-   Historical change view

## Could Have

-   Events/news
-   Notifications
-   Custom thresholds
-   Personalized attention profiles

## Won't Have in Initial MVP

-   Trading
-   Price prediction
-   Complex ML
-   Portfolio management
-   Social features
-   Full financial terminal functionality

------------------------------------------------------------------------

# 33. Final Product Definition

The Smart Market Watchlist is successful if a user can open it after
being away from the market and, within seconds, understand:

> **What changed?**

> **Which changes actually matter?**

> **Why do they matter?**

> **How unusual are they?**

> **What should I pay attention to first?**

The product should combine **market data, persistent user context,
meaningful-change detection, and clear explanation** into one simple
experience.

The fundamental product principle is:

> ## Don't make users monitor their watchlist. Help the watchlist monitor itself for them.

------------------------------------------------------------------------

# 34. Traceability to Groww Evaluation Criteria

  -----------------------------------------------------------------------
  Groww Evaluation Dimension          PRD Response
  ----------------------------------- -----------------------------------
  **Engineering Depth**               Persistent state, deterministic
                                      change engine, data freshness,
                                      scalable design

  **Product & Problem                 Focuses on attention and
  Interpretation**                    interpretation rather than merely
                                      displaying prices

  **Edge Cases & Resilience**         Explicit treatment of stale,
                                      delayed, conflicting and
                                      unavailable data

  **Code Quality & Simplicity**       Rule-based MVP and modular
                                      architecture instead of unnecessary
                                      complexity

  **Originality & Thoughtfulness**    User-specific "since last check"
                                      state and meaningful-change
                                      prioritization
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 35. Next Document

This PRD should be treated as the product contract for the next stage.

The next document, **`02_SRS.md`**, should translate these product
decisions into precise, testable system requirements covering:

-   Functional requirements
-   Non-functional requirements
-   User/account requirements
-   Watchlist requirements
-   Market-data requirements
-   Last-seen-state requirements
-   Meaningful-change engine requirements
-   Freshness requirements
-   Failure handling
-   API behavior
-   Data consistency
-   Security
-   Performance
-   Scalability
-   Acceptance criteria
