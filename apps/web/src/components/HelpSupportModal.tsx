import React, { useState, useEffect } from "react";

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopic?: string;
  onOpenManageWatchlists?: () => void;
  onOpenPreferences?: () => void;
}

interface HelpTopic {
  id: string;
  title: string;
  icon: string;
  badge?: string;
  summary: string;
  content: React.ReactNode;
}

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({
  isOpen,
  onClose,
  initialTopic = "overview",
  onOpenManageWatchlists,
  onOpenPreferences,
}) => {
  const [activeTopicId, setActiveTopicId] = useState<string>(initialTopic);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    if (initialTopic) {
      setActiveTopicId(initialTopic);
    }
  }, [initialTopic]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const topics: HelpTopic[] = [
    {
      id: "overview",
      title: "What is Smart Market Watchlist?",
      icon: "🎯",
      badge: "Core Philosophy",
      summary: "Attention-aware intelligence layer transforming market tracking from noisy ticker feeds to meaningful state changes.",
      content: (
        <div className="space-y-4 text-xs leading-relaxed text-[var(--text-secondary)]">
          <p>
            Standard market watchlists overwhelm traders with hundreds of constantly flashing green and red numbers. They force you to continuously compute: <em>"Did this move just happen? Was it already priced in when I checked 20 minutes ago?"</em>
          </p>
          <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] space-y-2">
            <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <span>💡</span>
              <span>The MarketMemory Breakthrough:</span>
            </div>
            <p className="text-[var(--text-muted)]">
              Instead of displaying raw day-change from yesterday's closing bell, MarketMemory tracks <strong>your individual attention state</strong>. It answers two crucial questions every time you open the screen:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-[var(--text-primary)] font-medium">
              <li>What meaningfully changed in my watchlist since I last checked?</li>
              <li>What deserves my immediate attention right now?</li>
            </ul>
          </div>
          <p>
            By computing multi-factor anomaly signals and dampening routine market noise, MarketMemory lets you focus only on actionable events.
          </p>
        </div>
      ),
    },
    {
      id: "baseline",
      title: "Understanding 'Since Your Last Check'",
      icon: "🕒",
      badge: "Differential Engine",
      summary: "How stateful baselines record your inspection moments and compute differential price deltas.",
      content: (
        <div className="space-y-4 text-xs leading-relaxed text-[var(--text-secondary)]">
          <p>
            The <strong>Last-Seen Baseline</strong> is the mathematical anchor of MarketMemory. Whenever you inspect a stock or click <em>"Mark All as Seen"</em>, the engine snapshots:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
              <span className="font-bold text-[var(--text-primary)] block mb-1">📌 Baseline Price & Volume</span>
              <span className="text-[var(--text-muted)]">The exact last traded price and cumulative volume at the moment of your observation.</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
              <span className="font-bold text-[var(--text-primary)] block mb-1">🔢 Monotonic Versioning</span>
              <span className="text-[var(--text-muted)]">Each acknowledgment increments a version counter (e.g. v1 → v2), preventing out-of-order race conditions.</span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-[var(--groww-primary-bg)] border border-[var(--groww-primary-border)] text-[var(--text-primary)]">
            <span className="font-semibold block mb-1">⚡ Why is this different from Day Change?</span>
            <span className="text-[var(--text-secondary)]">
              A stock might be up +5% for the day, but unchanged since you checked 5 minutes ago. In MarketMemory, its differential delta is <strong>0.00% (Unchanged)</strong>, preventing alert fatigue!
            </span>
          </div>
        </div>
      ),
    },
    {
      id: "meaningful",
      title: "What is a 'Meaningful Change'?",
      icon: "📊",
      badge: "Signal Detection",
      summary: "Mathematical filters separating market noise from statistically significant price breakouts and volume surges.",
      content: (
        <div className="space-y-4 text-xs leading-relaxed text-[var(--text-secondary)]">
          <p>
            A price tick is not deemed "meaningful" merely because it fluctuated by a few paise. The engine applies three robust criteria:
          </p>
          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
              <div className="font-bold text-[var(--text-primary)] flex items-center justify-between">
                <span>1. Volatility-Adjusted Thresholds</span>
                <span className="font-mono text-[10px] text-[var(--groww-primary)]">Δ &gt; 1.5%</span>
              </div>
              <p className="text-[var(--text-muted)] mt-1">
                The absolute difference between the current price and your last-seen baseline must breach minimum significance bounds (typically 1.5% for large caps, or 2σ of 15-minute standard deviation).
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
              <div className="font-bold text-[var(--text-primary)] flex items-center justify-between">
                <span>2. Volume Anomaly Multiplier</span>
                <span className="font-mono text-[10px] text-[var(--warning)]">&gt; 3.0× 20-Day Avg</span>
              </div>
              <p className="text-[var(--text-muted)] mt-1">
                A price move accompanied by 3× normal institutional trading volume generates an instant volume anomaly signal.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
              <div className="font-bold text-[var(--text-primary)] flex items-center justify-between">
                <span>3. Noise Dampening (Market-Wide Drops)</span>
                <span className="font-mono text-[10px] text-[var(--text-muted)]">Beta Isolation</span>
              </div>
              <p className="text-[var(--text-muted)] mt-1">
                When the entire NIFTY index plunges -4%, individual stock drops are categorized as broad market beta rather than isolated stock crises, reducing unnecessary alarm.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "attention",
      title: "Attention Levels Explained",
      icon: "⚡",
      badge: "Tri-Color Hierarchy",
      summary: "Clear visual hierarchy prioritizing stocks that need action from those that can be safely ignored.",
      content: (
        <div className="space-y-4 text-xs leading-relaxed text-[var(--text-secondary)]">
          <p>
            Every security in your watchlist is assigned an Attention Level based on real-time signal synthesis:
          </p>
          <div className="grid grid-cols-1 gap-2.5">
            <div className="p-3 rounded-xl bg-[var(--negative-bg)] border border-[var(--negative)]/30 flex items-start gap-3">
              <span className="text-xl">🔴</span>
              <div>
                <div className="font-bold text-[var(--negative)] flex items-center gap-2">
                  <span>HIGH ATTENTION</span>
                  <span className="text-[10px] font-mono font-normal">Immediate review advised</span>
                </div>
                <p className="text-[var(--text-secondary)] mt-1">
                  Assigned when a stock experiences a massive breakout, sudden gap down, severe volume spike, or multiple conflicting market signals since your last baseline.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--warning-bg)] border border-[var(--warning)]/30 flex items-start gap-3">
              <span className="text-xl">🟡</span>
              <div>
                <div className="font-bold text-[var(--warning)] flex items-center gap-2">
                  <span>MEDIUM ATTENTION</span>
                  <span className="text-[10px] font-mono font-normal">Notable movement</span>
                </div>
                <p className="text-[var(--text-secondary)] mt-1">
                  Assigned when a stock shows directional accumulation, moderate price divergence (0.75% - 1.5%), or order book imbalance.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] flex items-start gap-3">
              <span className="text-xl">🔵</span>
              <div>
                <div className="font-bold text-[var(--accent)] flex items-center gap-2">
                  <span>LOW ATTENTION</span>
                  <span className="text-[10px] font-mono font-normal">Gradual drift</span>
                </div>
                <p className="text-[var(--text-secondary)] mt-1">
                  Assigned when a stock moves slightly within normal intraday volatility bounds.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] flex items-start gap-3">
              <span className="text-xl">⚪</span>
              <div>
                <div className="font-bold text-[var(--text-muted)] flex items-center gap-2">
                  <span>UNCHANGED / IN-BAND</span>
                  <span className="text-[10px] font-mono font-normal">Noise dampened</span>
                </div>
                <p className="text-[var(--text-muted)] mt-1">
                  Price has not changed meaningfully since your last baseline. Safely ignored.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "confidence",
      title: "Confidence & Freshness States",
      icon: "🛡️",
      badge: "Data Integrity",
      summary: "How MarketMemory evaluates quote freshness and guards you against trading on stale or conflicting prices.",
      content: (
        <div className="space-y-4 text-xs leading-relaxed text-[var(--text-secondary)]">
          <p>
            In fast-moving markets, quote quality can degrade due to network pacing, gateway latency, or venue spread divergence. MarketMemory assigns a continuous <strong>Confidence Score (0-100%)</strong>:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
              <div className="flex items-center gap-2 font-bold text-[var(--groww-primary)] mb-1">
                <span className="w-2 h-2 rounded-full bg-[var(--groww-primary)] animate-pulse" />
                <span>FRESH (High Confidence)</span>
              </div>
              <p className="text-[var(--text-muted)]">
                Observation received within the last 60 seconds (or within 24 hours during closed market sessions). Real-time market feed is healthy and continuous.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
              <div className="flex items-center gap-2 font-bold text-[var(--warning)] mb-1">
                <span className="w-2 h-2 rounded-full bg-[var(--warning)]" />
                <span>DELAYED (Moderate Confidence)</span>
              </div>
              <p className="text-[var(--text-muted)]">
                Observation received between 61 and 300 seconds ago (1 to 5 minutes). Typical during exchange rate limits, burst pacing, or gateway latency.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
              <div className="flex items-center gap-2 font-bold text-[var(--text-muted)] mb-1">
                <span className="w-2 h-2 rounded-full bg-[var(--text-faint)]" />
                <span>STALE (Low Confidence)</span>
              </div>
              <p className="text-[var(--text-muted)]">
                Observation older than 300 seconds (&gt;5 minutes during open session, or &gt;24 hours during closed session). High risk of slippage; confidence degraded.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
              <div className="flex items-center gap-2 font-bold text-[var(--negative)] mb-1">
                <span className="w-2 h-2 rounded-full bg-[var(--negative)] animate-ping" />
                <span>CONFLICT (Feed Anomaly)</span>
              </div>
              <p className="text-[var(--text-muted)]">
                Detected disparity between primary and secondary quote feeds, or pending corporate action splits awaiting adjustment.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "operations",
      title: "Adding, Searching & Managing Stocks",
      icon: "📋",
      badge: "Watchlist Workflow",
      summary: "How to search 120+ NSE equities, create multiple watchlists, and organize your portfolio.",
      content: (
        <div className="space-y-4 text-xs leading-relaxed text-[var(--text-secondary)]">
          <p>
            MarketMemory makes managing watchlists fluid and instant:
          </p>
          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
              <span className="font-bold text-[var(--text-primary)] block mb-1">🔍 Fast Security Search</span>
              <p className="text-[var(--text-muted)]">
                Click <strong>"+ Add Stock"</strong> or tap the <kbd className="font-mono bg-[var(--surface)] px-1.5 py-0.5 rounded border border-[var(--border)]">/</kbd> shortcut on your keyboard. Search over 120+ NSE equities by ticker (e.g. <code>PCJEWELLER</code>, <code>TCS</code>, <code>ZOMATO</code>), company name, or industry sector.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
              <span className="font-bold text-[var(--text-primary)] block mb-1">⚙️ Multiple Watchlists</span>
              <p className="text-[var(--text-muted)]">
                Create dedicated lists for Banking, IT Tech, High Volatility, or Long-Term Holdings. Click <strong>"Switch / Edit"</strong> in the dashboard header to create, rename, or delete watchlists.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
              <span className="font-bold text-[var(--text-primary)] block mb-1">🗑️ Removing Securities</span>
              <p className="text-[var(--text-muted)]">
                Hover over any stock row or card, click the delete / trash icon, and confirm. The stock is removed without affecting your other watchlists.
              </p>
            </div>
          </div>
          {onOpenManageWatchlists && (
            <div className="pt-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenManageWatchlists();
                }}
                className="px-4 py-2 rounded-xl bg-[var(--groww-primary)] text-white font-semibold hover:bg-[var(--groww-primary-dark)] transition-colors cursor-pointer"
              >
                Open Watchlist Manager →
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "simulator",
      title: "Judge Demo Simulator & Scenarios",
      icon: "🏆",
      badge: "Hackathon Evaluation",
      summary: "Simulate live breakouts, volume surges, market crashes, and feed degradation in real time.",
      content: (
        <div className="space-y-4 text-xs leading-relaxed text-[var(--text-secondary)]">
          <p>
            To facilitate evaluation during the <strong>Code by Groww 2026 Hackathon</strong>, a floating interactive scenario simulator is included at the bottom-right of the screen:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
              <span className="font-bold text-[var(--text-primary)] block">🌱 Normal Market</span>
              <span className="text-[var(--text-muted)] text-[11px]">Quiet trading within typical ±0.4% baseline variance.</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
              <span className="font-bold text-[var(--negative)] block">⚡ Scenario 1: Big Move</span>
              <span className="text-[var(--text-muted)] text-[11px]">INFY plunges -5.1% while NIFTY drops -0.95% with 2.4× volume. Triggers High Attention.</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
              <span className="font-bold text-[var(--warning)] block">📉 Scenario 2: Market Crash</span>
              <span className="text-[var(--text-muted)] text-[11px]">Systemic -4.85% sell-off dampens individual stock alarms.</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
              <span className="font-bold text-[var(--groww-primary)] block">🔥 Scenario 3: Volume Surge</span>
              <span className="text-[var(--text-muted)] text-[11px]">RELIANCE surges 3.2× normal volume without price panic.</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
              <span className="font-bold text-[var(--accent)] block">⏳ Scenario 4: Feed Latency</span>
              <span className="text-[var(--text-muted)] text-[11px]">Simulates network delays, degrading freshness to DELAYED.</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
              <span className="font-bold text-[var(--text-primary)] block">✂️ Scenario 6: 2:1 Stock Split</span>
              <span className="text-[var(--text-muted)] text-[11px]">TCS executes split; algorithm adjusts baseline to prevent false 50% crash alert.</span>
            </div>
          </div>
          <p className="text-[var(--text-muted)]">
            Click the floating <strong>"🏆 Judge Demo Simulator"</strong> pill at the bottom-right of your screen anytime to trigger these scenarios!
          </p>
        </div>
      ),
    },
  ];

  const filteredTopics = topics.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.badge?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeTopic = topics.find((t) => t.id === activeTopicId) || topics[0]!;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--surface)] border border-[var(--border)] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--groww-primary-bg)] border border-[var(--groww-primary-border)] flex items-center justify-center text-xl">
              📖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-display tracking-tight text-[var(--text-primary)]">
                  MarketMemory Knowledge Base
                </h2>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-[var(--groww-primary-bg)] text-[var(--groww-primary)] border border-[var(--groww-primary-border)]">
                  HELP & SUPPORT
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Interactive guide to stateful baselines, attention hierarchy, and data confidence
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
            title="Close modal (Esc)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-3 border-b border-[var(--border)] bg-[var(--surface-secondary)] flex items-center gap-3 flex-shrink-0">
          <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topics (e.g. baseline, attention, confidence, demo)..."
            className="w-full bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] border-none focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Modal Body: Two-column layout on medium+ screens */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Left Column: Topic List (5 cols) */}
          <div className="md:col-span-5 border-r border-[var(--border)] overflow-y-auto p-3 space-y-1.5 max-h-[35vh] md:max-h-none">
            {filteredTopics.map((topic) => {
              const isSelected = activeTopic.id === topic.id;
              return (
                <button
                  key={topic.id}
                  onClick={() => setActiveTopicId(topic.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer flex items-start gap-2.5 ${
                    isSelected
                      ? "bg-[var(--groww-primary-bg)] border border-[var(--groww-primary-border)] text-[var(--text-primary)] shadow-2xs"
                      : "hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-transparent"
                  }`}
                >
                  <span className="text-xl flex-shrink-0 mt-0.5">{topic.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-bold truncate text-[var(--text-primary)]">{topic.title}</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] line-clamp-1">
                      {topic.summary}
                    </p>
                  </div>
                </button>
              );
            })}

            {filteredTopics.length === 0 && (
              <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                No matching topics found for "{searchQuery}"
              </div>
            )}
          </div>

          {/* Right Column: Topic Details & Deep Dive (7 cols) */}
          <div className="md:col-span-7 overflow-y-auto p-6 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {activeTopic.badge && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--groww-primary-bg)] text-[var(--groww-primary)] border border-[var(--groww-primary-border)]">
                    {activeTopic.badge}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold font-display text-[var(--text-primary)] flex items-center gap-2">
                <span>{activeTopic.icon}</span>
                <span>{activeTopic.title}</span>
              </h3>
            </div>

            {/* Dynamic Content */}
            <div className="pt-2 border-t border-[var(--border)]">
              {activeTopic.content}
            </div>

            {/* Quick Actions Footer inside Help */}
            <div className="pt-6 border-t border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
              <div className="text-[11px] text-[var(--text-muted)]">
                Need more help? Check the floating Judge Demo Control on screen.
              </div>
              {onOpenPreferences && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenPreferences();
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
                >
                  ⚙️ Preferences
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
