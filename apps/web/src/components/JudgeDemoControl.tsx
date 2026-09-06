import React, { useState } from "react";

interface JudgeDemoControlProps {
  currentScenario: string;
  onSelectScenario: (scenario: string) => void;
  onMarkAllSeen: () => void;
  ticksReceived: number;
  isStreamConnected: boolean;
}

const SCENARIOS = [
  {
    id: "NORMAL",
    label: "🌱 Normal Market",
    subtext: "Quiet trading within expected ±0.4% variance",
    badge: "CALM",
    badgeColor: "bg-slate-700 text-slate-300",
  },
  {
    id: "BIG_MOVE",
    label: "⚡ Scenario 1: Big Move",
    subtext: "INFY plunges -5.1% while NIFTY drops -0.95% with 2.4× volume",
    badge: "HIGH ATTENTION",
    badgeColor: "bg-rose-950 text-rose-300 border border-rose-800",
  },
  {
    id: "MARKET_WIDE_DROP",
    label: "📉 Scenario 2: Market-Wide Drop",
    subtext: "NIFTY plunges -4.85%, dampens attention across all stocks",
    badge: "NOISE FILTER",
    badgeColor: "bg-amber-950 text-amber-300 border border-amber-800",
  },
  {
    id: "VOLUME_SPIKE",
    label: "🔥 Scenario 3: Volume Spike",
    subtext: "RELIANCE surges 3.2× normal volume without price panic",
    badge: "VOLUME ANOMALY",
    badgeColor: "bg-amber-950 text-amber-300 border border-amber-800",
  },
  {
    id: "DATA_DELAY",
    label: "⏳ Scenario 4: Stale / Delayed Feed",
    subtext: "Timestamps >15 mins old degrade confidence to DELAYED",
    badge: "CONFIDENCE DROP",
    badgeColor: "bg-blue-950 text-blue-300 border border-blue-800",
  },
  {
    id: "DATA_CONFLICT",
    label: "⚠️ Scenario 5: Provider Conflict",
    subtext: "Mismatched quote feeds (+4% spread) flag LOW confidence",
    badge: "ANOMALY ALERT",
    badgeColor: "bg-rose-950 text-rose-300 border border-rose-800",
  },
  {
    id: "CORPORATE_ACTION",
    label: "✂️ Scenario 6: Corporate Action",
    subtext: "TCS executes 2:1 split; adjustment prevents false 50% crash",
    badge: "SPLIT ADJUSTED",
    badgeColor: "bg-emerald-950 text-emerald-300 border border-emerald-800",
  },
  {
    id: "LATE_OBSERVATION",
    label: "🕒 Scenario 8: Out-of-Order Packet",
    subtext: "Late-arriving packet sorted monotonically by observation time",
    badge: "ORDER PRESERVED",
    badgeColor: "bg-slate-700 text-slate-300",
  },
];

export const JudgeDemoControl: React.FC<JudgeDemoControlProps> = ({
  currentScenario,
  onSelectScenario,
  onMarkAllSeen,
  ticksReceived,
  isStreamConnected,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-lg w-full px-3 sm:px-0 pointer-events-none">
      <div className="pointer-events-auto">
        {/* Collapsed Pill Button */}
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="ml-auto flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#161c26] border-2 border-[#00D09C] text-white shadow-2xl hover:scale-105 transition-all text-xs font-semibold backdrop-blur-md group"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#00D09C] animate-pulse" />
            <span className="font-bold tracking-wide text-white">🏆 Judge Demo Simulator</span>
            <span className="px-2 py-0.5 rounded-md bg-[#00D09C]/20 text-[#00D09C] text-[10px] font-mono font-bold">
              {currentScenario}
            </span>
          </button>
        ) : (
          /* Expanded Controller Panel */
          <div className="bg-[#111827] border border-[#374151] rounded-3xl shadow-2xl p-5 text-slate-100 backdrop-blur-md animate-fadeIn max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-[#1F2937]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00D09C] animate-pulse" />
                <h4 className="text-xs font-bold font-display uppercase tracking-wider text-white">
                  Groww Challenge • Simulation Engine
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00D09C]/15 text-[#00D09C] border border-[#00D09C]/30 font-semibold">
                  {isStreamConnected ? "🟢 SSE Live Stream" : "🟡 Polling"}
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1F2937] transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2 my-3 text-[11px]">
              <div className="p-2.5 rounded-xl bg-[#1F2937]/70 border border-[#374151]">
                <span className="text-slate-400 block text-[10px]">Active Scenario</span>
                <strong className="font-mono text-[#00D09C] truncate block mt-0.5">
                  {currentScenario}
                </strong>
              </div>
              <div className="p-2.5 rounded-xl bg-[#1F2937]/70 border border-[#374151]">
                <span className="text-slate-400 block text-[10px]">Realtime Ticks</span>
                <strong className="font-mono text-white block mt-0.5">
                  {ticksReceived} ticks
                </strong>
              </div>
              <div className="p-2.5 rounded-xl bg-[#1F2937]/70 border border-[#374151] flex flex-col justify-between">
                <span className="text-slate-400 block text-[10px]">Reset Baseline</span>
                <button
                  onClick={onMarkAllSeen}
                  className="text-[10px] font-bold text-[#00D09C] hover:underline text-left mt-0.5"
                >
                  Mark All Seen →
                </button>
              </div>
            </div>

            {/* Scenario Buttons */}
            <div className="space-y-2 mt-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Select Competition Scenario:
              </div>
              {SCENARIOS.map((sc) => {
                const isActive = currentScenario === sc.id;
                return (
                  <button
                    key={sc.id}
                    onClick={() => onSelectScenario(sc.id)}
                    className={`w-full text-left p-3 rounded-xl text-xs transition-all flex flex-col gap-1 border ${
                      isActive
                        ? "bg-[#00D09C]/15 text-white border-[#00D09C] ring-1 ring-[#00D09C]"
                        : "bg-[#1F2937]/50 text-slate-300 hover:bg-[#1F2937] border-[#374151]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{sc.label}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${sc.badgeColor}`}>
                        {sc.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      {sc.subtext}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
