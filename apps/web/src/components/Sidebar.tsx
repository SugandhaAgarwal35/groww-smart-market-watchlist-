import React from "react";
import type { SnapshotItem } from "@watchlist/contracts";

interface SidebarProps {
  items: SnapshotItem[];
  onSelectStock?: (symbol: string) => void;
  activeFilter?: string;
  onSelectFilter?: (filter: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  items,
  onSelectStock,
  activeFilter = "ALL",
  onSelectFilter,
}) => {
  const highAttnCount = items.filter((i) => i.change.attention === "HIGH").length;
  const volumeSpikeCount = items.filter((i) =>
    i.signals?.some((s) => s.type === "VOLUME_ANOMALY")
  ).length;
  const meaningfulMoveCount = items.filter(
    (i) => i.seen.baselinePrice && i.change.state !== "UNCHANGED"
  ).length;

  return (
    <aside className="space-y-5 hidden lg:block">
      {/* Quick Watchlist Widget */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] overflow-hidden shadow-2xs">
        <div className="px-4 py-3 border-b border-[#EAECF0] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#1E222D]">Watchlist Ticker</h3>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00D09C] live-pulse" />
            <span className="text-[10px] font-medium text-[#00B386]">Live Feed</span>
          </div>
        </div>
        <div className="divide-y divide-[#F0F2F5]">
          {items.slice(0, 8).map((item) => {
            const isPositive = (item.market.dayChangePct ?? 0) >= 0;
            return (
              <div
                key={item.security.id}
                onClick={() => onSelectStock?.(item.security.symbol)}
                className="px-4 py-2.5 flex items-center justify-between hover:bg-[#F8F9FA] cursor-pointer transition-colors"
              >
                <div className="min-w-0 mr-3">
                  <div className="text-sm font-semibold text-[#1E222D] truncate">
                    {item.security.symbol}
                  </div>
                  <div className="text-[11px] text-[#7C7E8C] truncate">
                    {(item.security as unknown as { sectorName?: string }).sectorName || "NSE Equity"}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold text-[#1E222D] font-mono">
                    ₹{item.market.price?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) ?? "—"}
                  </div>
                  <div
                    className={`text-[11px] font-semibold font-mono ${
                      isPositive ? "text-[#00B386]" : "text-[#EB5757]"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {item.market.dayChangePct?.toFixed(2) ?? "0.00"}%
                  </div>
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-[#7C7E8C]">
              No stocks in watchlist yet
            </div>
          )}
        </div>
      </div>

      {/* Watchlist Intelligence Quick Filters */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-[#1E222D] uppercase tracking-wider">
            Quick Watchlist Filters
          </h3>
          <span className="text-[10px] text-[#7C7E8C] font-mono">Realtime</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "ALL", label: "All Stocks", icon: "📋", count: items.length },
            { id: "HIGH", label: "High Attention", icon: "⚡", count: highAttnCount },
            { id: "VOLUME", label: "Volume Surge", icon: "🔥", count: volumeSpikeCount },
            { id: "MOVES", label: "Active Moves", icon: "📈", count: meaningfulMoveCount },
          ].map((tool) => {
            const isSelected = activeFilter === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => onSelectFilter?.(tool.id)}
                className={`flex flex-col p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-[#00D09C] bg-[#E6F9F5] text-[#00B386] shadow-2xs"
                    : "border-[#EAECF0] bg-[#F8F9FA] hover:bg-[#F2F4F7] text-[#44475B]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base">{tool.icon}</span>
                  <span
                    className={`text-[11px] font-bold font-mono px-1.5 py-0.2 rounded-md ${
                      isSelected ? "bg-white text-[#00B386]" : "bg-[#EAECF0] text-[#7C7E8C]"
                    }`}
                  >
                    {tool.count}
                  </span>
                </div>
                <span className="text-xs font-semibold mt-1.5 truncate">{tool.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stateful Market Context Summary */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] p-4 shadow-2xs">
        <h3 className="text-xs font-bold text-[#1E222D] uppercase tracking-wider mb-2.5">
          Intelligence Summary
        </h3>
        <div className="space-y-2 text-xs text-[#44475B]">
          <div className="p-2 rounded-xl bg-[#F8F9FA] flex items-center justify-between">
            <span className="text-[#7C7E8C]">Tracked Baseline</span>
            <span className="font-semibold text-[#1E222D] font-mono">
              {items.filter((i) => i.seen.baselinePrice !== null).length} / {items.length} Recorded
            </span>
          </div>
          <div className="p-2 rounded-xl bg-[#F8F9FA] flex items-center justify-between">
            <span className="text-[#7C7E8C]">High Priority Signals</span>
            <span
              className={`font-semibold font-mono ${
                highAttnCount > 0 ? "text-[#EB5757]" : "text-[#00B386]"
              }`}
            >
              {highAttnCount} Triggered
            </span>
          </div>
          <div className="p-2 rounded-xl bg-[#F8F9FA] flex items-center justify-between">
            <span className="text-[#7C7E8C]">Noise Filtering</span>
            <span className="font-semibold text-[#00B386]">Enabled (Dampened)</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
