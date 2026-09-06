import React, { useState, useEffect, useRef } from "react";
import type { SnapshotItem } from "@watchlist/contracts";
import { MiniSparkline } from "./MiniSparkline.js";
import { ConfirmDialog } from "./ConfirmDialog.js";

interface GrowwStockTableProps {
  items: SnapshotItem[];
  watchlistId: string;
  onMarkSeen: (item: SnapshotItem) => Promise<void>;
  onRemove: (securityId: string) => Promise<void>;
  onOpenAnalytics?: (item: SnapshotItem) => void;
  tickHistoryMap?: Record<string, number[]>;
}

export const GrowwStockTable: React.FC<GrowwStockTableProps> = ({
  items,
  onMarkSeen,
  onRemove,
  onOpenAnalytics,
  tickHistoryMap,
}) => {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [confirmItem, setConfirmItem] = useState<SnapshotItem | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Track price flashes on real-time tick updates
  const prevPrices = useRef<Record<string, number>>({});
  const [flashes, setFlashes] = useState<Record<string, "UP" | "DOWN" | null>>({});

  useEffect(() => {
    const newFlashes: Record<string, "UP" | "DOWN" | null> = {};
    let changed = false;

    for (const item of items) {
      const p = item.market.price ?? 0;
      const prev = prevPrices.current[item.security.symbol];
      if (prev != null && prev !== p) {
        newFlashes[item.security.symbol] = p > prev ? "UP" : "DOWN";
        changed = true;
      }
      prevPrices.current[item.security.symbol] = p;
    }

    if (changed) {
      setFlashes(newFlashes);
      const timer = setTimeout(() => {
        setFlashes({});
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [items]);

  const toggleExpand = (id: string) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const handleMarkSeenClick = async (e: React.MouseEvent, item: SnapshotItem) => {
    e.stopPropagation();
    setMarkingId(item.security.id);
    try {
      await onMarkSeen(item);
    } finally {
      setMarkingId(null);
    }
  };

  const handleRemoveClick = (e: React.MouseEvent, item: SnapshotItem) => {
    e.stopPropagation();
    setConfirmItem(item);
  };

  const handleConfirmRemove = async () => {
    if (!confirmItem) return;
    setIsRemoving(true);
    try {
      await onRemove(confirmItem.security.id);
      setConfirmItem(null);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#EAECF0] bg-white shadow-sm">
      <table className="groww-table w-full text-left">
        <thead>
          <tr className="border-b border-[#EAECF0] text-[#7C7E8C] text-xs uppercase tracking-wider bg-[#F8F9FA]">
            <th className="w-[24%] py-3.5 px-4 font-semibold">Company</th>
            <th className="w-[20%] py-3.5 px-4 font-semibold">Price & 1D Change</th>
            <th className="w-[21%] py-3.5 px-4 font-semibold">Since Last Check</th>
            <th className="w-[27%] py-3.5 px-4 font-semibold">Why It Matters</th>
            <th className="w-[8%] py-3.5 px-4 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EAECF0]">
          {items.map((item) => {
            const isPositive = (item.market.dayChangePct ?? 0) >= 0;
            const isFirstView = item.change.state === "FIRST_VIEW";
            const isExpanded = expandedRowId === item.security.id;
            const isMarking = markingId === item.security.id;
            const flash = flashes[item.security.symbol];

            // Calculate baseline price delta
            const baselinePrice = item.seen.baselinePrice;
            const currentPrice = item.market.price;
            const priceChangePct =
              baselinePrice != null && baselinePrice > 0 && currentPrice != null
                ? ((currentPrice - baselinePrice) / baselinePrice) * 100
                : null;

            // Sparkline points - use real observation history from live feed or baseline transition
            const realHistory = tickHistoryMap?.[item.security.symbol];
            const basePrice = item.market.price ?? 1000;
            const prevClose = item.market.previousClose ?? basePrice;
            const effectiveBaseline = baselinePrice ?? prevClose;

            const sparkData =
              realHistory && realHistory.length >= 2
                ? realHistory
                : [effectiveBaseline, prevClose, basePrice];

            // Attention styling
            let attnBadge = (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F4F6F8] text-[#7C7E8C]">
                NONE
              </span>
            );
            if (item.change.attention === "HIGH") {
              attnBadge = (
                <span className="bg-[#FDF2F2] text-[#EB5757] border border-[#EB5757]/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EB5757] animate-ping" />
                  HIGH
                </span>
              );
            } else if (item.change.attention === "MEDIUM") {
              attnBadge = (
                <span className="bg-[#FFF9EB] text-[#F5A623] border border-[#F5A623]/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  MEDIUM
                </span>
              );
            } else if (item.change.attention === "LOW") {
              attnBadge = (
                <span className="bg-[#EEF2F6] text-[#3B82F6] border border-[#3B82F6]/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  LOW
                </span>
              );
            }

            // Extract primary explanation
            const explanationText =
              isFirstView
                ? "First view: baseline established at current market price."
                : item.explanation?.[0] || item.seen.sinceLastCheck || "Normal market variance; no abnormal deviation.";

            // Volume signal
            const volSignal = item.signals?.find((s) => s.type === "VOLUME_ANOMALY");
            const volAnomalyVal = volSignal?.value;

            return (
              <React.Fragment key={item.security.id}>
                <tr
                  onClick={() => onOpenAnalytics ? onOpenAnalytics(item) : toggleExpand(item.security.id)}
                  className={`hover:bg-[#F9FAFB] transition-colors cursor-pointer group ${
                    isExpanded ? "bg-[#F4F6F8]" : ""
                  }`}
                >
                  {/* Company Info */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#F4F6F8] border border-[#EAECF0] flex items-center justify-center font-bold text-xs text-[#44475B] group-hover:border-[#00B386]/50 group-hover:text-[#00B386] transition-colors flex-shrink-0">
                        {item.security.symbol.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-[#1E222D] flex items-center gap-1.5">
                          <span className="truncate">{item.security.name}</span>
                          <span className="text-[10px] text-[#7C7E8C] font-normal px-1.5 py-0.2 rounded bg-[#F4F6F8] border border-[#EAECF0]">
                            {item.security.exchange}
                          </span>
                        </div>
                        <div className="text-xs text-[#7C7E8C] font-mono flex items-center gap-2 mt-0.5">
                          <span className="font-semibold text-[#44475B]">{item.security.symbol}</span>
                          <span>•</span>
                          <span className="text-[11px] text-[#7C7E8C]">
                            {(item.security as unknown as { sectorName?: string }).sectorName || "NSE Equity"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Market Price & 1D Change (Combined with Sparkline) */}
                  <td className="py-3.5 px-4 font-mono">
                    <div className="flex items-center gap-3">
                      <div>
                        <div
                          className={`inline-block font-bold text-sm text-[#1E222D] px-1.5 py-0.5 rounded transition-all duration-300 ${
                            flash === "UP"
                              ? "bg-[#E6F9F5] text-[#00B386] scale-105"
                              : flash === "DOWN"
                              ? "bg-[#FDF2F2] text-[#EB5757] scale-105"
                              : ""
                          }`}
                        >
                          ₹{item.market.price?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) ?? "—"}
                        </div>
                        <div
                          className={`text-xs font-semibold flex items-center gap-1 mt-0.5 ${
                            isPositive ? "text-[#00B386]" : "text-[#EB5757]"
                          }`}
                        >
                          <span>{isPositive ? "+" : ""}₹{item.market.dayChange?.toFixed(2) ?? "0.00"}</span>
                          <span className="text-[10px] font-normal">
                            ({isPositive ? "+" : ""}{item.market.dayChangePct?.toFixed(2) ?? "0.00"}%)
                          </span>
                        </div>
                      </div>
                      <div className="hidden xl:block">
                        <MiniSparkline
                          data={sparkData}
                          isPositive={isPositive}
                          width={64}
                          height={20}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Since Your Last Check (Smart Baseline Differential) */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {attnBadge}
                        <span className="text-xs font-bold font-mono text-[#1E222D]">
                          {isFirstView
                            ? "First View"
                            : priceChangePct != null
                            ? `${priceChangePct >= 0 ? "+" : ""}${priceChangePct.toFixed(2)}%`
                            : "—"}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#7C7E8C] font-mono">
                        {baselinePrice != null
                          ? `₹${baselinePrice.toFixed(2)} → ₹${currentPrice?.toFixed(2)}`
                          : "Baseline pending"}
                      </div>
                    </div>
                  </td>

                  {/* Why It Matters (Prominent Natural Language Explanation) */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-1">
                      <div className="text-xs font-medium text-[#1E222D] leading-snug">
                        {explanationText}
                      </div>
                      {volAnomalyVal != null && volAnomalyVal > 1.4 && (
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-[#F5A623] bg-[#FFF9EB] px-2 py-0.5 rounded-md border border-[#F5A623]/30 w-fit">
                          <span>🔥</span>
                          <span>{volAnomalyVal.toFixed(1)}× Normal Volume</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Actions (Details / Depth, Seen, Remove) */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {/* View Analytics Modal button */}
                      {onOpenAnalytics && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenAnalytics(item);
                          }}
                          title="Open Stock Analytics & Depth"
                          className="px-2.5 py-1 rounded-lg bg-[#F4F6F8] hover:bg-[#EAECF0] hover:text-[#00B386] border border-[#EAECF0] text-[11px] text-[#44475B] font-semibold transition-all"
                        >
                          Details
                        </button>
                      )}

                      {/* Mark Seen Button */}
                      {!isFirstView && item.change.attention !== "NONE" && (
                        <button
                          onClick={(e) => handleMarkSeenClick(e, item)}
                          disabled={isMarking}
                          title="Acknowledge this change and advance baseline"
                          className="px-2 py-1 rounded-lg bg-[#E6F9F5] hover:bg-[#C9F2E9] text-[#00B386] border border-[#00B386]/30 text-[11px] font-semibold transition-all whitespace-nowrap"
                        >
                          {isMarking ? "..." : "Seen"}
                        </button>
                      )}

                      {/* Remove Button */}
                      <button
                        onClick={(e) => handleRemoveClick(e, item)}
                        title="Remove from watchlist"
                        className="p-1 rounded-lg text-[#9B9DA8] hover:text-[#EB5757] hover:bg-[#FDF2F2] transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>

                      {/* Expand Chevron */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(item.security.id);
                        }}
                        title="Toggle evidence audit drawer"
                        className={`p-1 rounded-lg text-[#7C7E8C] hover:text-[#1E222D] hover:bg-[#F4F6F8] transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Expanded Row: Full Differential Evidence Audit Drawer */}
                {isExpanded && (
                  <tr className="bg-[#F8F9FA] border-b border-[#EAECF0]">
                    <td colSpan={5} className="p-4 sm:p-5">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAECF0] pb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#00B386]">
                              🔍 Differential Evidence Audit Trail
                            </span>
                            <span className="text-[11px] text-[#7C7E8C] font-mono">
                              Baseline: v{item.seen.baselineVersion ?? 1}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-[#7C7E8C]">Data Confidence:</span>
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                item.change.confidence === "HIGH"
                                  ? "bg-[#E6F9F5] text-[#00B386]"
                                  : item.change.confidence === "MEDIUM"
                                  ? "bg-[#FFF9EB] text-[#F5A623]"
                                  : "bg-[#FDF2F2] text-[#EB5757]"
                              }`}
                            >
                              {item.change.confidence} (
                              {Math.round((item.change.confidenceScore ?? 1) * 100)}%)
                            </span>
                          </div>
                        </div>

                        {/* Signals Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Signal 1: Market Relative */}
                          <div className="p-3 bg-white rounded-xl border border-[#EAECF0]">
                            <div className="text-[11px] text-[#7C7E8C] font-medium flex items-center justify-between">
                              <span>Alpha vs NIFTY 50</span>
                              <span>📊</span>
                            </div>
                            <div className="mt-1 font-bold text-sm font-mono text-[#1E222D]">
                              {(() => {
                                const s = item.signals?.find((x) => x.type === "MARKET_RELATIVE");
                                return s?.value != null ? `${(s.value * 100).toFixed(2)}%` : "Aligned with market";
                              })()}
                            </div>
                            <div className="text-[10px] text-[#7C7E8C] mt-1">
                              Idiosyncratic move decoupled from index
                            </div>
                          </div>

                          {/* Signal 2: Volume Anomaly */}
                          <div className="p-3 bg-white rounded-xl border border-[#EAECF0]">
                            <div className="text-[11px] text-[#7C7E8C] font-medium flex items-center justify-between">
                              <span>Volume Surge</span>
                              <span>🔥</span>
                            </div>
                            <div className="mt-1 font-bold text-sm font-mono text-[#1E222D]">
                              {volAnomalyVal != null
                                ? `${volAnomalyVal.toFixed(2)}× Average`
                                : "Normal Volume (1.0×)"}
                            </div>
                            <div className="text-[10px] text-[#7C7E8C] mt-1">
                              30-day baseline moving average ratio
                            </div>
                          </div>

                          {/* Signal 3: Sector Divergence */}
                          <div className="p-3 bg-white rounded-xl border border-[#EAECF0]">
                            <div className="text-[11px] text-[#7C7E8C] font-medium flex items-center justify-between">
                              <span>Sector Relative Move</span>
                              <span>🏢</span>
                            </div>
                            <div className="mt-1 font-bold text-sm font-mono text-[#1E222D]">
                              {(() => {
                                const s = item.signals?.find((x) => x.type === "SECTOR_RELATIVE");
                                return s?.value != null ? `${(s.value * 100).toFixed(2)}%` : "Aligned with sector";
                              })()}
                            </div>
                            <div className="text-[10px] text-[#7C7E8C] mt-1">
                              Movement compared to sector peers
                            </div>
                          </div>
                        </div>

                        {/* Explanations List */}
                        {item.explanation && item.explanation.length > 0 && (
                          <div className="bg-white p-3 rounded-xl border border-[#EAECF0]">
                            <div className="text-[11px] font-semibold text-[#44475B] uppercase tracking-wider mb-1.5">
                              Grounded Explanations
                            </div>
                            <ul className="space-y-1 text-xs text-[#44475B]">
                              {item.explanation.map((exp, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-[#00B386] font-bold mt-0.5">•</span>
                                  <span>{exp}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {/* In-app Groww Confirmation Modal */}
      <ConfirmDialog
        isOpen={confirmItem !== null}
        title={`Remove ${confirmItem?.security.symbol}?`}
        message={`This will remove ${confirmItem?.security.name || confirmItem?.security.symbol} from your current watchlist.`}
        confirmLabel="Remove"
        isDestructive={true}
        isLoading={isRemoving}
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirmItem(null)}
      />
    </div>
  );
};
