import React, { useState, useEffect } from "react";
import { api, type StockTick } from "../lib/api.js";
import { MiniSparkline } from "./MiniSparkline.js";

interface GrowwDiscoverProps {
  onSelectStock?: (symbol: string) => void;
  onAddStock?: (securityId: string) => void;
}

export const GrowwDiscover: React.FC<GrowwDiscoverProps> = ({
  onSelectStock,
  onAddStock,
}) => {
  const [activeTab, setActiveTab] = useState<"gainers" | "losers" | "bought">("gainers");
  const [gainers, setGainers] = useState<StockTick[]>([]);
  const [losers, setLosers] = useState<StockTick[]>([]);
  const [mostBought, setMostBought] = useState<StockTick[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTool, setSelectedTool] = useState<{
    title: string;
    desc: string;
    icon: string;
    detail: string;
  } | null>(null);

  const fetchMovers = async () => {
    try {
      const data = await api.getMovers();
      setGainers(data.gainers || []);
      setLosers(data.losers || []);
      setMostBought(data.mostBought || []);
    } catch (err) {
      console.error("Failed to load movers:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMovers();
    const interval = setInterval(fetchMovers, 4000);
    return () => clearInterval(interval);
  }, []);

  const currentList =
    activeTab === "gainers" ? gainers : activeTab === "losers" ? losers : mostBought;

  return (
    <div className="mt-12 pt-8 border-t border-[#EAECF0] space-y-8">
      {/* Groww Discover Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-[#00B386] uppercase tracking-wider bg-[#E6F9F5] border border-[#00B386]/20 px-2.5 py-0.5 rounded-full">
              Real-Time Market Pulse
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00B386] animate-pulse" />
            <span className="text-[11px] text-[#7C7E8C] font-mono">Live Computed</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-[#1E222D] tracking-tight">
            Top Movers & Most Bought on Groww
          </h2>
          <p className="text-xs text-[#7C7E8C] mt-0.5">
            Calculated dynamically from real-time NSE trade ticks across all 20 blue-chip stocks
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F4F6F8] rounded-xl border border-[#EAECF0] self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("gainers")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "gainers"
                ? "bg-white text-[#00B386] shadow-sm font-bold"
                : "text-[#7C7E8C] hover:text-[#1E222D]"
            }`}
          >
            Top Gainers ({gainers.length})
          </button>
          <button
            onClick={() => setActiveTab("losers")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "losers"
                ? "bg-white text-[#EB5757] shadow-sm font-bold"
                : "text-[#7C7E8C] hover:text-[#1E222D]"
            }`}
          >
            Top Losers ({losers.length})
          </button>
          <button
            onClick={() => setActiveTab("bought")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "bought"
                ? "bg-white text-[#00B386] shadow-sm font-bold"
                : "text-[#7C7E8C] hover:text-[#1E222D]"
            }`}
          >
            Most Active ({mostBought.length})
          </button>
        </div>
      </div>

      {/* Grid of Stock mini cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-32 rounded-xl bg-[#F4F6F8] border border-[#EAECF0] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {currentList.slice(0, 4).map((st) => {
            const isPositive = (st.dayChangePct ?? 0) >= 0;

            return (
              <div
                key={st.symbol}
                onClick={() => onSelectStock && onSelectStock(st.symbol)}
                className="p-4 rounded-xl bg-white border border-[#EAECF0] hover:border-[#00B386]/40 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#F4F6F8] border border-[#EAECF0] flex items-center justify-center font-bold text-xs text-[#44475B] group-hover:border-[#00B386]/50 group-hover:text-[#00B386] transition-colors">
                      {st.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-[#1E222D] truncate max-w-[110px]">{st.symbol}</div>
                      <div className="text-[10px] text-[#7C7E8C] truncate max-w-[110px]">{st.sectorName}</div>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                      isPositive
                        ? "bg-[#E6F9F5] text-[#00B386] border border-[#00B386]/30"
                        : "bg-[#FDF2F2] text-[#EB5757] border border-[#EB5757]/30"
                    }`}
                  >
                    {isPositive ? "+" : ""}{st.dayChangePct?.toFixed(2)}%
                  </span>
                </div>

                {/* Mini Live Sparkline */}
                <div className="my-2 flex justify-center">
                  <MiniSparkline
                    data={st.tickHistory}
                    isPositive={isPositive}
                    width={180}
                    height={28}
                  />
                </div>

                {/* Price and Day Change */}
                <div className="flex items-baseline justify-between pt-2 border-t border-[#EAECF0]">
                  <span className="text-sm font-bold text-[#1E222D] font-mono">
                    ₹{st.currentPrice?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                  <span
                    className={`text-xs font-medium font-mono ${
                      isPositive ? "text-[#00B386]" : "text-[#EB5757]"
                    }`}
                  >
                    {isPositive ? "+" : ""}₹{st.dayChange?.toFixed(2)}
                  </span>
                </div>

                {/* Quick Add Overlay on Hover */}
                {onAddStock && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddStock(st.securityId);
                    }}
                    title="Add to active watchlist"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded-md bg-[#00B386] text-white font-semibold text-[10px] flex items-center gap-1 shadow-md hover:bg-[#009E77]"
                  >
                    <span>+ Watchlist</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Groww Products & Tools Row (Secondary informational ecosystem links) */}
      <div className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-[#7C7E8C] uppercase tracking-wider">
            Investment Tools on Groww
          </h3>
          <span className="text-[10px] text-[#7C7E8C] font-mono">Ecosystem Reference</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              title: "F&O - Option Chain",
              desc: "Nifty, Bank Nifty open interest & Greeks context",
              icon: "📊",
              detail: "Derivatives volume anomalies and open interest shifts feed into the Smart Watchlist volume significance scoring.",
            },
            {
              title: "Smart Stock Screener",
              desc: "Filter 5000+ stocks by PE, ROE, 52W High",
              icon: "🔍",
              detail: "Securities discovered through screening can be added to your custom watchlists for real-time tracking.",
            },
            {
              title: "Upcoming IPOs",
              desc: "Apply via UPI, track GMP and allotments",
              icon: "🚀",
              detail: "Newly listed instruments automatically join the corporate actions adjustment pipeline upon debut.",
            },
            {
              title: "Mutual Funds SIP",
              desc: "Top rated funds, zero commission direct plans",
              icon: "🌱",
              detail: "Institutional holdings data informs constituent weightings in market-relative movement calculations.",
            },
          ].map((tool, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedTool(tool)}
              className="p-3.5 rounded-xl bg-white border border-[#EAECF0] hover:border-[#00B386]/40 hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="text-2xl mb-2 group-hover:scale-105 transition-transform origin-left">
                {tool.icon}
              </div>
              <div className="text-xs font-bold text-[#1E222D] group-hover:text-[#00B386] transition-colors">
                {tool.title}
              </div>
              <div className="text-[11px] text-[#7C7E8C] mt-1 line-clamp-2 leading-relaxed">
                {tool.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Informational Modal for Secondary Tools */}
      {selectedTool && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
          onClick={() => setSelectedTool(null)}
        >
          <div
            className="w-full max-w-sm bg-white border border-[#EAECF0] rounded-2xl p-5 shadow-xl text-[#1E222D]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <span className="text-3xl">{selectedTool.icon}</span>
              <div>
                <h4 className="text-sm font-bold">{selectedTool.title}</h4>
                <span className="text-[10px] text-[#00B386] font-semibold bg-[#E6F9F5] px-2 py-0.5 rounded-full">
                  Ecosystem Integration
                </span>
              </div>
            </div>
            <p className="text-xs text-[#44475B] leading-relaxed mb-4">
              {selectedTool.detail}
            </p>
            <div className="text-[11px] text-[#7C7E8C] bg-[#F8F9FA] p-2.5 rounded-xl border border-[#EAECF0] mb-4">
              💡 The core Smart Market Watchlist serves as your operational command center for price & volume deviations.
            </div>
            <button
              onClick={() => setSelectedTool(null)}
              className="w-full py-2 text-xs font-semibold text-white bg-[#00D09C] hover:bg-[#00B386] rounded-xl transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
