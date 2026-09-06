import React from "react";
import type { MarketIndex, StockTick } from "../lib/api.js";
import { MiniSparkline } from "./MiniSparkline.js";

interface StocksExplorePageProps {
  indices: MarketIndex[];
  gainers: StockTick[];
  losers: StockTick[];
  mostBought: StockTick[];
  onSelectStock?: (symbol: string) => void;
  onAddStock?: (securityId: string) => void;
}

export const StocksExplorePage: React.FC<StocksExplorePageProps> = ({
  indices,
  gainers,
  losers,
  mostBought,
  onSelectStock,
  onAddStock,
}) => {
  const [activeMovers, setActiveMovers] = React.useState<"gainers" | "losers">("gainers");
  const [timePeriod, setTimePeriod] = React.useState("1D");

  const currentMovers = activeMovers === "gainers" ? gainers : losers;

  return (
    <div className="space-y-8">
      {/* Market Indices Cards */}
      <section>
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-none pb-1">
          {indices.map((idx) => {
            const isPositive = idx.change >= 0;
            return (
              <div
                key={idx.symbol}
                className="min-w-[180px] flex-shrink-0 p-4 bg-white rounded-lg border border-[#EAECF0] hover:shadow-md transition-all cursor-pointer"
              >
                <div className="text-xs font-medium text-[#7C7E8C] mb-1">{idx.symbol}</div>
                <div className="text-lg font-bold text-[#1E222D] font-mono">
                  {idx.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className={`flex items-center gap-1.5 mt-1 text-xs font-semibold ${
                  isPositive ? "text-[#00B386]" : "text-[#EB5757]"
                }`}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    {isPositive
                      ? <path d="M5 2L9 7H1L5 2Z" />
                      : <path d="M5 8L1 3H9L5 8Z" />
                    }
                  </svg>
                  <span>{isPositive ? "+" : ""}{idx.change.toFixed(2)}</span>
                  <span>({isPositive ? "+" : ""}{idx.changePct.toFixed(2)}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Most Bought on Groww */}
      <section>
        <h2 className="text-lg font-bold text-[#1E222D] mb-4">Most Bought on Groww</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {mostBought.slice(0, 4).map((stock) => {
            const isPositive = (stock.dayChangePct ?? 0) >= 0;
            return (
              <div
                key={stock.symbol}
                onClick={() => onSelectStock?.(stock.symbol)}
                className="p-4 bg-white rounded-lg border border-[#EAECF0] hover:shadow-md transition-all cursor-pointer group relative"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#F2F4F7] border border-[#EAECF0] flex items-center justify-center text-xs font-bold text-[#44475B]">
                    {stock.symbol.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[#1E222D] truncate">{stock.symbol}</div>
                    <div className="text-[11px] text-[#7C7E8C] truncate">{stock.name || stock.sectorName}</div>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-base font-bold text-[#1E222D] font-mono">
                      ₹{stock.currentPrice?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                    <div className={`text-xs font-semibold mt-0.5 ${
                      isPositive ? "text-[#00B386]" : "text-[#EB5757]"
                    }`}>
                      {isPositive ? "+" : ""}{stock.dayChangePct?.toFixed(2)}%
                    </div>
                  </div>
                  <MiniSparkline
                    data={stock.tickHistory}
                    isPositive={isPositive}
                    width={80}
                    height={28}
                  />
                </div>
                {onAddStock && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddStock(stock.securityId); }}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded-md bg-[#00D09C] text-white text-[10px] font-bold shadow-sm hover:bg-[#00B386]"
                  >
                    + Watchlist
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Top Gainers / Losers */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-[#1E222D]">
              {activeMovers === "gainers" ? "Top Gainers" : "Top Losers"}
            </h2>
            <div className="flex items-center bg-[#F2F4F7] rounded-lg p-0.5">
              <button
                onClick={() => setActiveMovers("gainers")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeMovers === "gainers"
                    ? "bg-white text-[#00B386] shadow-sm"
                    : "text-[#7C7E8C] hover:text-[#44475B]"
                }`}
              >
                Gainers
              </button>
              <button
                onClick={() => setActiveMovers("losers")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeMovers === "losers"
                    ? "bg-white text-[#EB5757] shadow-sm"
                    : "text-[#7C7E8C] hover:text-[#44475B]"
                }`}
              >
                Losers
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-[#F2F4F7] rounded-lg p-0.5">
            {["1D", "1W", "1M", "1Y"].map((p) => (
              <button
                key={p}
                onClick={() => setTimePeriod(p)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  timePeriod === p
                    ? "bg-white text-[#1E222D] shadow-sm"
                    : "text-[#7C7E8C] hover:text-[#44475B]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#EAECF0] overflow-hidden">
          <table className="groww-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Price</th>
                <th>Change</th>
                <th className="hidden sm:table-cell">Volume</th>
              </tr>
            </thead>
            <tbody>
              {currentMovers.slice(0, 5).map((stock) => {
                const isPositive = (stock.dayChangePct ?? 0) >= 0;
                return (
                  <tr
                    key={stock.symbol}
                    onClick={() => onSelectStock?.(stock.symbol)}
                    className="cursor-pointer"
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#F2F4F7] border border-[#EAECF0] flex items-center justify-center text-[10px] font-bold text-[#44475B]">
                          {stock.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[#1E222D]">{stock.symbol}</div>
                          <div className="text-[11px] text-[#7C7E8C]">{stock.sectorName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-sm font-semibold text-[#1E222D]">
                      ₹{stock.currentPrice?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className={`text-xs font-semibold ${isPositive ? "text-[#00B386]" : "text-[#EB5757]"}`}>
                        {isPositive ? "+" : ""}{stock.dayChangePct?.toFixed(2)}%
                      </span>
                    </td>
                    <td className="hidden sm:table-cell text-xs text-[#7C7E8C] font-mono">
                      {stock.volume?.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Products & Tools */}
      <section>
        <h2 className="text-lg font-bold text-[#1E222D] mb-4">Products & Tools</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { title: "F&O - Option Chain", desc: "Nifty, Bank Nifty OI & Greeks", icon: "📊" },
            { title: "Stock Screener", desc: "Filter stocks by PE, ROE, MCAP", icon: "🔍" },
            { title: "Upcoming IPOs", desc: "Apply via UPI, track GMP", icon: "🚀" },
            { title: "Mutual Funds SIP", desc: "Zero commission direct plans", icon: "🌱" },
          ].map((tool, idx) => (
            <div
              key={idx}
              className="p-4 bg-white rounded-lg border border-[#EAECF0] hover:shadow-md hover:border-[#00D09C]/30 transition-all cursor-pointer group"
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform origin-left">{tool.icon}</div>
              <div className="text-sm font-semibold text-[#1E222D] group-hover:text-[#00B386] transition-colors">{tool.title}</div>
              <div className="text-[11px] text-[#7C7E8C] mt-1 leading-relaxed">{tool.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
