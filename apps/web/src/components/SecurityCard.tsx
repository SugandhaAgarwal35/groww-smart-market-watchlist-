import React, { useState } from "react";
import type { SnapshotItem } from "@watchlist/contracts";
import { ConfirmDialog } from "./ConfirmDialog.js";

interface SecurityCardProps {
  item: SnapshotItem;
  watchlistId: string;
  onMarkSeen: (item: SnapshotItem) => Promise<void>;
  onRemove: (securityId: string) => Promise<void>;
}

export const SecurityCard: React.FC<SecurityCardProps> = ({
  item,
  onMarkSeen,
  onRemove,
}) => {
  const [isMarking, setIsMarking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { security, market, change, explanation, seen } = item;
  const isPositive = (market.dayChangePct ?? 0) >= 0;
  const isFirstView = change.state === "FIRST_VIEW";

  const handleMarkSeenClick = async () => {
    setIsMarking(true);
    try {
      await onMarkSeen(item);
    } finally {
      setIsMarking(false);
    }
  };

  const handleRemoveClick = () => {
    setIsConfirmOpen(true);
  };

  const handleConfirmRemove = async () => {
    setIsDeleting(true);
    try {
      await onRemove(security.id);
      setIsConfirmOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Card border styling based on Attention Level
  let cardClass = "border-[#EAECF0]";
  let badgeClass = "bg-[#F4F6F8] text-[#7C7E8C]";
  if (change.attention === "HIGH") {
    cardClass = "border-[#EB5757]/40 shadow-sm";
    badgeClass = "bg-[#FDF2F2] text-[#EB5757] border border-[#EB5757]/30";
  } else if (change.attention === "MEDIUM") {
    cardClass = "border-[#F5A623]/40 shadow-sm";
    badgeClass = "bg-[#FFF9EB] text-[#F5A623] border border-[#F5A623]/30";
  } else if (change.attention === "LOW") {
    cardClass = "border-[#5367FF]/30";
    badgeClass = "bg-[#EEF2F6] text-[#5367FF] border border-[#5367FF]/20";
  }

  // Confidence styling
  let confColor = "text-[#00B386]";
  if (change.confidence === "MEDIUM") confColor = "text-[#F5A623]";
  if (change.confidence === "LOW") confColor = "text-[#EB5757]";

  // Freshness styling
  let freshClass = "text-[#00B386] bg-[#E6F9F5] border-[#00B386]/20";
  if (market.freshness === "DELAYED")
    freshClass = "text-[#F5A623] bg-[#FFF9EB] border-[#F5A623]/30";
  if (market.freshness === "STALE" || market.freshness === "UNKNOWN")
    freshClass = "text-[#EB5757] bg-[#FDF2F2] border-[#EB5757]/30";

  return (
    <div
      className={`bg-white p-5 rounded-2xl border relative transition-all duration-300 flex flex-col justify-between hover:shadow-md hover:border-[#D0D5DD] ${cardClass}`}
    >
      {/* Card Header: Symbol, Name, Attention Badge */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-lg text-[#1E222D] tracking-tight">
                {security.symbol}
              </span>
              <span className="text-[10px] text-[#7C7E8C] font-mono bg-[#F4F6F8] border border-[#EAECF0] px-1.5 py-0.5 rounded">
                {security.exchange}
              </span>
            </div>
            <div className="text-xs text-[#7C7E8C] line-clamp-1 mt-0.5">
              {security.name}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
              {change.attention} ATTENTION
            </span>
            <button
              onClick={handleRemoveClick}
              disabled={isDeleting}
              className="text-[#9B9DA8] hover:text-[#EB5757] text-sm p-1 transition-colors"
              title="Remove security"
            >
              ×
            </button>
          </div>
        </div>

        {/* Price & Day Movement */}
        <div className="mt-4 flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-bold font-mono text-[#1E222D]">
              ₹
              {market.price !== null
                ? market.price.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "—"}
            </span>
          </div>

          {market.dayChangePct !== null && (
            <div
              className={`text-sm font-semibold font-mono flex items-center gap-1 ${
                isPositive ? "text-[#00B386]" : "text-[#EB5757]"
              }`}
            >
              <span>{isPositive ? "▲" : "▼"}</span>
              <span>
                {isPositive ? "+" : ""}
                {market.dayChangePct.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        {/* Since Last Check Highlight Box */}
        <div className="mt-3.5 bg-[#F8F9FA] rounded-xl p-3 border border-[#EAECF0] space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#7C7E8C] flex items-center justify-between">
            <span>Since Your Last Check</span>
            {isFirstView && (
              <span className="text-[10px] text-[#00B386] bg-[#E6F9F5] border border-[#00B386]/20 px-1.5 py-0.5 rounded-full font-bold">
                First View
              </span>
            )}
          </div>

          {isFirstView ? (
            <div className="text-xs text-[#7C7E8C] italic">
              No baseline established yet. Click below to start tracking changes from this price.
            </div>
          ) : (
            <div className="text-xs font-mono font-medium text-[#1E222D]">
              {seen.sinceLastCheck ?? "No price change recorded."}
            </div>
          )}
        </div>

        {/* Structured Explanations */}
        {explanation.length > 0 && (
          <div className="mt-3.5 space-y-1.5 border-t border-[#EAECF0] pt-3">
            {explanation.map((fact, idx) => (
              <div
                key={idx}
                className="text-xs text-[#44475B] flex items-start gap-2"
              >
                <span className="text-[#00B386] font-bold">›</span>
                <span>{fact}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card Footer: Confidence, Freshness & Mark as Seen action */}
      <div className="mt-5 pt-3 border-t border-[#EAECF0] flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          {/* Confidence Indicator */}
          <div className="flex items-center gap-1.5 font-medium" title="Data confidence rating">
            <span className={`w-2 h-2 rounded-full ${confColor} bg-current`} />
            <span className={`text-[11px] font-semibold ${confColor}`}>{change.confidence}</span>
          </div>

          {/* Freshness Badge */}
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${freshClass}`}>
            {market.freshness}
          </span>
        </div>

        {/* Action Button */}
        {isFirstView ? (
          <button
            onClick={handleMarkSeenClick}
            disabled={isMarking || market.price === null}
            className="text-xs font-semibold py-1 px-3 text-[#00B386] bg-[#E6F9F5] hover:bg-[#C9F2E9] border border-[#00B386]/30 rounded-lg transition-all"
          >
            {isMarking ? "Saving..." : "Start Tracking"}
          </button>
        ) : change.attention !== "NONE" ? (
          <button
            onClick={handleMarkSeenClick}
            disabled={isMarking}
            className="text-xs font-semibold py-1 px-3 text-[#00B386] bg-[#E6F9F5] hover:bg-[#C9F2E9] border border-[#00B386]/30 rounded-lg transition-all"
            title="Update baseline to current snapshot"
          >
            {isMarking ? "Updating..." : "Mark Seen"}
          </button>
        ) : (
          <span className="text-[11px] text-[#7C7E8C]">Up to date</span>
        )}
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title={`Remove ${security.symbol}?`}
        message={`This will remove ${security.name || security.symbol} from your current watchlist.`}
        confirmLabel="Remove"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmRemove}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
};
