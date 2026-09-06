import React from "react";
import type { ChangeSummary, WatchlistSummary } from "@watchlist/contracts";

interface WatchlistDashboardProps {
  watchlist?: WatchlistSummary;
  summary?: ChangeSummary;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  viewMode: "table" | "card";
  onViewModeChange: (mode: "table" | "card") => void;
  onOpenAddSecurity?: () => void;
  onMarkAllSeen?: () => Promise<void>;
  baselineTime?: string | null;
  baselineVersion?: number;
  isMarkingAll?: boolean;
  onOpenManageWatchlists?: () => void;
  sessionStatus?: string;
  sessionMessage?: string;
  isDemoMode?: boolean;
}

export const WatchlistDashboard: React.FC<WatchlistDashboardProps> = ({
  watchlist,
  summary,
  activeFilter,
  onFilterChange,
  viewMode,
  onViewModeChange,
  onOpenAddSecurity,
  onMarkAllSeen,
  baselineTime,
  baselineVersion,
  isMarkingAll = false,
  onOpenManageWatchlists,
  sessionStatus,
  sessionMessage,
  isDemoMode = false,
}) => {
  const formattedBaseline = React.useMemo(() => {
    if (!baselineTime) return "Session Start";
    try {
      const d = new Date(baselineTime);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "Active";
    }
  }, [baselineTime]);

  return (
    <div className="mb-6 space-y-4">
      {/* Top Row: Title, Baseline Pill & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#EAECF0] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-[#00B386] uppercase tracking-wider bg-[#E6F9F5] border border-[#00B386]/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00B386] animate-pulse" />
              Smart Market Watchlist
            </span>
            <span className="text-xs text-[#7C7E8C] font-mono bg-[#F8F9FA] px-2 py-0.5 rounded-md border border-[#EAECF0]">
              {watchlist?.itemCount ?? 0} Securities Tracked
            </span>
            {baselineVersion != null && (
              <span className="text-xs text-[#44475B] font-mono bg-[#F4F6F8] px-2.5 py-0.5 rounded-md border border-[#EAECF0] flex items-center gap-1">
                <span>🕒 Baseline: {formattedBaseline}</span>
                <span className="text-[#9CA3AF]">(v{baselineVersion})</span>
              </span>
            )}
            {sessionStatus && (
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-md flex items-center gap-1.5 ${
                  sessionStatus === "OPEN"
                    ? "bg-[#E6F9F5] text-[#00B386] border border-[#00B386]/30"
                    : "bg-[#FFF9EB] text-[#F5A623] border border-[#F5A623]/30"
                }`}
                title={sessionMessage}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${sessionStatus === "OPEN" ? "bg-[#00B386] animate-pulse" : "bg-[#F5A623]"}`} />
                <span>{sessionStatus === "OPEN" ? "Live NSE" : "Market Closed"}</span>
              </span>
            )}
            {isDemoMode && (
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-[#111827] text-[#00D09C] border border-[#00D09C]/40">
                DEMO MODE
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold font-display tracking-tight text-[#1E222D]">
              {watchlist?.name ?? "Primary Core Watchlist"}
            </h2>
            {onOpenManageWatchlists && (
              <button
                onClick={onOpenManageWatchlists}
                className="px-2.5 py-1 text-xs font-semibold text-[#00B386] bg-[#E6F9F5] hover:bg-[#D2F5EC] border border-[#00B386]/30 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Switch, create, or rename watchlists"
              >
                <span>⚙️ Switch / Edit</span>
              </button>
            )}
          </div>
          <p className="text-xs text-[#7C7E8C] mt-1 max-w-xl">
            Stateful intelligence that isolates stock-specific signals, filters broad market noise, and explains changes since your last check.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Mark All as Seen Button */}
          {onMarkAllSeen && (
            <button
              onClick={onMarkAllSeen}
              disabled={isMarkingAll}
              title="Acknowledge current market prices and advance baseline"
              className="bg-[#E6F9F5] hover:bg-[#D2F5EC] text-[#00B386] border border-[#00B386]/30 text-xs font-semibold py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>{isMarkingAll ? "Advancing..." : "Mark All as Seen"}</span>
            </button>
          )}

          {/* Add Stock Button */}
          {onOpenAddSecurity && (
            <button
              onClick={onOpenAddSecurity}
              className="bg-[#00D09C] hover:bg-[#00B386] text-white text-xs font-semibold py-2 px-3.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
              </svg>
              <span>+ Add Stock</span>
            </button>
          )}

          {/* Table / Card View Switcher */}
          <div className="flex items-center bg-[#F4F6F8] p-1 rounded-xl border border-[#EAECF0]">
            <button
              onClick={() => onViewModeChange("table")}
              title="Groww Table View"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "table"
                  ? "bg-white text-[#00B386] shadow-xs font-bold"
                  : "text-[#7C7E8C] hover:text-[#1E222D]"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18" />
              </svg>
              <span>Table</span>
            </button>
            <button
              onClick={() => onViewModeChange("card")}
              title="Detailed Card View"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "card"
                  ? "bg-white text-[#00B386] shadow-xs font-bold"
                  : "text-[#7C7E8C] hover:text-[#1E222D]"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              <span>Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* Intelligence Summary Stat Cards (Interactive Filters) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Meaningful Changes */}
        <div
          onClick={() => onFilterChange("CHANGED")}
          className={`p-4 rounded-xl cursor-pointer transition-all border ${
            activeFilter === "CHANGED"
              ? "bg-[#E6F9F5]/40 border-[#00B386] shadow-sm ring-2 ring-[#00B386]/20"
              : "bg-white border-[#EAECF0] hover:border-[#00B386]/40 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#00B386]">
            <span>Meaningful Changes</span>
            <span className="w-2 h-2 rounded-full bg-[#00B386] animate-pulse" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-display text-[#1E222D] mt-1.5">
            {summary?.meaningfulChanges ?? 0}
          </div>
          <div className="text-[11px] text-[#7C7E8C] mt-1 flex items-center gap-1">
            <span>Diverging from baseline</span>
          </div>
        </div>

        {/* High Attention */}
        <div
          onClick={() => onFilterChange("HIGH")}
          className={`p-4 rounded-xl cursor-pointer transition-all border ${
            activeFilter === "HIGH"
              ? "bg-[#FDF2F2] border-[#EB5757] shadow-sm ring-2 ring-[#EB5757]/20"
              : "bg-white border-[#EAECF0] hover:border-[#EB5757]/40 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#EB5757]">
            <span>High Attention</span>
            <span className="w-2 h-2 rounded-full bg-[#EB5757] animate-ping" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-display text-[#EB5757] mt-1.5">
            {summary?.highAttention ?? 0}
          </div>
          <div className="text-[11px] text-[#7C7E8C] mt-1">
            Abnormal moves & spikes
          </div>
        </div>

        {/* Medium Attention */}
        <div
          onClick={() => onFilterChange("MEDIUM")}
          className={`p-4 rounded-xl cursor-pointer transition-all border ${
            activeFilter === "MEDIUM"
              ? "bg-[#FFF9EB] border-[#F5A623] shadow-sm ring-2 ring-[#F5A623]/20"
              : "bg-white border-[#EAECF0] hover:border-[#F5A623]/40 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#F5A623]">
            <span>Medium Attention</span>
            <span className="w-2 h-2 rounded-full bg-[#F5A623]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-display text-[#F5A623] mt-1.5">
            {summary?.mediumAttention ?? 0}
          </div>
          <div className="text-[11px] text-[#7C7E8C] mt-1">
            Sector / trend divergence
          </div>
        </div>

        {/* Low / Quiet */}
        <div
          onClick={() => onFilterChange("LOW")}
          className={`p-4 rounded-xl cursor-pointer transition-all border ${
            activeFilter === "LOW"
              ? "bg-[#EEF2F6] border-[#3B82F6] shadow-sm ring-2 ring-[#3B82F6]/20"
              : "bg-white border-[#EAECF0] hover:border-[#3B82F6]/40 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#3B82F6]">
            <span>Low / Quiet</span>
            <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-display text-[#44475B] mt-1.5">
            {summary?.lowAttention ?? 0}
          </div>
          <div className="text-[11px] text-[#7C7E8C] mt-1">
            Within normal volatility
          </div>
        </div>
      </div>

      {/* Filter Row Pills */}
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <span className="text-xs text-[#7C7E8C] font-medium mr-1">Active Filter:</span>
        <button
          onClick={() => onFilterChange("ALL")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            activeFilter === "ALL"
              ? "bg-[#1E222D] text-white shadow-xs"
              : "text-[#44475B] hover:text-[#1E222D] bg-white border border-[#EAECF0] hover:bg-[#F4F6F8]"
          }`}
        >
          All Securities ({watchlist?.itemCount ?? 0})
        </button>
        <button
          onClick={() => onFilterChange("HIGH")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            activeFilter === "HIGH"
              ? "bg-[#FDF2F2] text-[#EB5757] border border-[#EB5757]/40 shadow-xs font-bold"
              : "text-[#44475B] hover:text-[#1E222D] bg-white border border-[#EAECF0] hover:bg-[#F4F6F8]"
          }`}
        >
          High Attention ({summary?.highAttention ?? 0})
        </button>
        <button
          onClick={() => onFilterChange("MEDIUM")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            activeFilter === "MEDIUM"
              ? "bg-[#FFF9EB] text-[#F5A623] border border-[#F5A623]/40 shadow-xs font-bold"
              : "text-[#44475B] hover:text-[#1E222D] bg-white border border-[#EAECF0] hover:bg-[#F4F6F8]"
          }`}
        >
          Medium Attention ({summary?.mediumAttention ?? 0})
        </button>
        <button
          onClick={() => onFilterChange("CHANGED")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            activeFilter === "CHANGED"
              ? "bg-[#E6F9F5] text-[#00B386] border border-[#00B386]/40 shadow-xs font-bold"
              : "text-[#44475B] hover:text-[#1E222D] bg-white border border-[#EAECF0] hover:bg-[#F4F6F8]"
          }`}
        >
          Changed Only ({summary?.meaningfulChanges ?? 0})
        </button>
      </div>
    </div>
  );
};
