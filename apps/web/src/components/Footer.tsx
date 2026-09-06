import React from "react";

interface FooterProps {
  onSelectTab?: (tab: string) => void;
  onOpenHelp?: (topic?: string) => void;
  onOpenManageWatchlists?: () => void;
  onOpenPreferences?: () => void;
  onOpenSearch?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onSelectTab,
  onOpenHelp,
  onOpenManageWatchlists,
  onOpenPreferences,
  onOpenSearch,
}) => {
  return (
    <footer className="mt-20 border-t border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-muted)] text-xs transition-colors">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-12">
        {/* Upper grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand Col */}
          <div className="sm:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="40" height="40" rx="10" fill="#00D09C" />
                <path
                  d="M12 28L18 20L23 25L30 14"
                  stroke="#FFFFFF"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="30" cy="14" r="2.5" fill="#FFFFFF" />
              </svg>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-lg tracking-tight text-[var(--text-primary)]">
                  MarketMemory
                </span>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-[var(--groww-primary-bg)] text-[var(--groww-primary)] border border-[var(--groww-primary-border)]">
                  CODE BY GROWW 2026
                </span>
              </div>
            </div>
            <p className="text-[var(--text-muted)] text-xs leading-relaxed max-w-sm">
              MarketMemory — a smart market watchlist built for Code by Groww 2026. An attention-aware intelligence layer transforming market tracking from continuous polling to differential baseline awareness.
            </p>
            <div className="text-[11px] text-[var(--text-muted)] pt-1 space-y-1">
              <p>
                💡 Answering: <em>"What meaningfully changed in my watchlist since I last checked?"</em>
              </p>
              <p className="text-[10px] text-[var(--text-faint)]">
                Hackathon Prototype • Attention Hierarchy & Baseline Differential Engine
              </p>
            </div>
          </div>

          {/* Column 1: Products */}
          <div>
            <div className="font-semibold text-[var(--text-primary)] uppercase tracking-wider text-[11px] mb-3">
              Products
            </div>
            <ul className="space-y-2 text-[var(--text-secondary)] text-xs">
              <li>
                <button
                  onClick={() => {
                    onSelectTab?.("STOCKS");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="hover:text-[var(--groww-primary)] transition-colors text-left cursor-pointer flex items-center gap-1"
                >
                  <span>Stocks & ETFs</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[var(--groww-primary-bg)] text-[var(--groww-primary)]">
                    In-App
                  </span>
                </button>
              </li>
              <li>
                <a
                  href="https://groww.in/fno"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--groww-primary)] transition-colors inline-flex items-center gap-1"
                >
                  <span>Futures & Options</span>
                  <span className="text-[10px] text-[var(--text-muted)]">↗</span>
                </a>
              </li>
              <li>
                <a
                  href="https://groww.in/mutual-funds"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--groww-primary)] transition-colors inline-flex items-center gap-1"
                >
                  <span>Mutual Funds</span>
                  <span className="text-[10px] text-[var(--text-muted)]">↗</span>
                </a>
              </li>
              <li>
                <a
                  href="https://groww.in/ipo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--groww-primary)] transition-colors inline-flex items-center gap-1"
                >
                  <span>Upcoming IPOs</span>
                  <span className="text-[10px] text-[var(--text-muted)]">↗</span>
                </a>
              </li>
              <li>
                <a
                  href="https://groww.in/sovereign-gold-bonds"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--groww-primary)] transition-colors inline-flex items-center gap-1"
                >
                  <span>Sovereign Gold Bonds</span>
                  <span className="text-[10px] text-[var(--text-muted)]">↗</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Smart Features */}
          <div>
            <div className="font-semibold text-[var(--text-primary)] uppercase tracking-wider text-[11px] mb-3">
              Smart Features
            </div>
            <ul className="space-y-2 text-[var(--text-secondary)] text-xs">
              <li>
                <button
                  onClick={() => {
                    onSelectTab?.("SMART_WATCHLIST");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="hover:text-[var(--groww-primary)] transition-colors text-left cursor-pointer flex items-center gap-1 font-semibold text-[var(--groww-primary)]"
                >
                  <span>Smart Watchlist</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--groww-primary)] animate-pulse" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenHelp?.("baseline")}
                  className="hover:text-[var(--groww-primary)] transition-colors text-left cursor-pointer"
                >
                  Baseline Differential
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenHelp?.("simulator")}
                  className="hover:text-[var(--groww-primary)] transition-colors text-left cursor-pointer"
                >
                  Market Simulator
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenManageWatchlists?.()}
                  className="hover:text-[var(--groww-primary)] transition-colors text-left cursor-pointer"
                >
                  Watchlist Manager
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPreferences?.()}
                  className="hover:text-[var(--groww-primary)] transition-colors text-left cursor-pointer"
                >
                  Display Preferences
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Help & Regulatory */}
          <div>
            <div className="font-semibold text-[var(--text-primary)] uppercase tracking-wider text-[11px] mb-3">
              Help & Regulatory
            </div>
            <ul className="space-y-2 text-[var(--text-secondary)] text-xs">
              <li>
                <button
                  onClick={() => onOpenHelp?.("overview")}
                  className="hover:text-[var(--groww-primary)] transition-colors text-left cursor-pointer flex items-center gap-1 font-semibold text-[var(--groww-primary)]"
                >
                  <span>Help & Support Guide</span>
                  <span className="text-[10px]">📖</span>
                </button>
              </li>
              <li>
                <a
                  href="https://www.sebi.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--groww-primary)] transition-colors inline-flex items-center gap-1"
                >
                  <span>SEBI Official Portal</span>
                  <span className="text-[10px] text-[var(--text-muted)]">↗</span>
                </a>
              </li>
              <li>
                <a
                  href="https://groww.in/terms-and-conditions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--groww-primary)] transition-colors inline-flex items-center gap-1"
                >
                  <span>Terms and Conditions</span>
                  <span className="text-[10px] text-[var(--text-muted)]">↗</span>
                </a>
              </li>
              <li>
                <a
                  href="https://groww.in/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--groww-primary)] transition-colors inline-flex items-center gap-1"
                >
                  <span>Privacy Policy</span>
                  <span className="text-[10px] text-[var(--text-muted)]">↗</span>
                </a>
              </li>
              <li>
                <a
                  href="https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doInvestorCharter=yes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--groww-primary)] transition-colors inline-flex items-center gap-1"
                >
                  <span>Investor Charter</span>
                  <span className="text-[10px] text-[var(--text-muted)]">↗</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="pt-6 border-t border-[var(--border)] text-[11px] leading-relaxed text-[var(--text-muted)] space-y-2">
          <p>
            <strong className="text-[var(--text-primary)]">Hackathon Evaluation Notice:</strong> MarketMemory is an attention-aware prototype submitted for the Code by Groww 2026 Hackathon. This platform does not execute actual exchange orders or hold client funds. All market data feeds and scenarios are streamed for prototype evaluation and testing.
          </p>
          <p>
            <strong className="text-[var(--text-primary)]">Market Risk Disclosure:</strong> Investments in securities markets are subject to market risks. Read all related scheme and offer documents carefully before making investment decisions. Regulatory entities (SEBI, NSE, BSE) are cited for standard compliance alignment.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[var(--border)] text-[var(--text-muted)] text-[11px]">
            <span>© 2026 MarketMemory. Built for Code by Groww 2026. Smart Watchlist Engine v2.0</span>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-[var(--groww-primary)] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--groww-primary)] animate-pulse" />
                NSE Live Feed / Simulation Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
