import React, { useEffect, useState, useRef } from "react";
import type { MarketIndex } from "../lib/api.js";

interface MarketIndicesRibbonProps {
  indices: MarketIndex[];
  isLive?: boolean;
}

export const MarketIndicesRibbon: React.FC<MarketIndicesRibbonProps> = ({
  indices,
  isLive = true,
}) => {
  const prevValues = useRef<Record<string, number>>({});
  const [flashStates, setFlashStates] = useState<Record<string, "UP" | "DOWN" | null>>({});

  useEffect(() => {
    if (!indices || indices.length === 0) return;

    const newFlashes: Record<string, "UP" | "DOWN" | null> = {};
    let hasChanges = false;

    for (const idx of indices) {
      const prev = prevValues.current[idx.symbol];
      if (prev != null && prev !== idx.value) {
        newFlashes[idx.symbol] = idx.value > prev ? "UP" : "DOWN";
        hasChanges = true;
      }
      prevValues.current[idx.symbol] = idx.value;
    }

    if (hasChanges) {
      setFlashStates(newFlashes);
      const timer = setTimeout(() => {
        setFlashStates({});
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [indices]);

  if (!indices || indices.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-white border-b border-[#EAECF0] overflow-x-auto scrollbar-none py-2 px-4 sm:px-6">
      <div className="max-w-[1240px] mx-auto flex items-center gap-3">
        {/* Live Indicator */}
        {isLive && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#E6F9F5] border border-[#00B386]/20 text-[11px] text-[#00B386] whitespace-nowrap font-bold">
            <span className="w-2 h-2 rounded-full bg-[#00B386] animate-pulse" />
            <span>NSE LIVE</span>
          </div>
        )}

        {/* Index Cards */}
        <div className="flex items-center gap-2.5 min-w-max flex-1">
          {indices.map((idx) => {
            const flash = flashStates[idx.symbol];
            const isPositive = idx.change >= 0;

            return (
              <div
                key={idx.symbol}
                className={`flex items-center gap-3 px-3 py-1.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                  flash === "UP"
                    ? "bg-[#E6F9F5] border-[#00B386]/40 shadow-xs"
                    : flash === "DOWN"
                    ? "bg-[#FDF2F2] border-[#EB5757]/40 shadow-xs"
                    : "bg-[#F8F9FA] border-[#EAECF0] hover:bg-white hover:border-[#D0D5DD] hover:shadow-xs"
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-[#7C7E8C] tracking-tight">
                    {idx.symbol}
                  </span>
                  <span className="text-xs font-bold font-mono text-[#1E222D]">
                    {idx.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex flex-col items-end text-[11px] font-mono">
                  <span
                    className={`font-bold flex items-center gap-0.5 ${
                      isPositive ? "text-[#00B386]" : "text-[#EB5757]"
                    }`}
                  >
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor">
                      {isPositive
                        ? <path d="M5 2L9 7H1L5 2Z" />
                        : <path d="M5 8L1 3H9L5 8Z" />
                      }
                    </svg>
                    <span>{isPositive ? "+" : ""}{idx.change.toFixed(2)}</span>
                  </span>
                  <span
                    className={`text-[10px] font-medium ${
                      isPositive ? "text-[#00B386]" : "text-[#EB5757]"
                    }`}
                  >
                    ({isPositive ? "+" : ""}{idx.changePct.toFixed(2)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
