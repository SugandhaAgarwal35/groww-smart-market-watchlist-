import React from "react";

interface CategoryTabsProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

const TABS = [
  { id: "STOCKS", label: "Stocks" },
  { id: "MUTUAL_FUNDS", label: "Mutual Funds" },
  { id: "FNO", label: "F&O" },
  { id: "US_STOCKS", label: "US Stocks" },
  { id: "SMART_WATCHLIST", label: "Smart Watchlist", highlight: true },
];

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <div className="w-full bg-white border-b border-[#EAECF0]">
      <div className="max-w-[1240px] mx-auto px-6">
        <nav className="flex items-center gap-0 overflow-x-auto scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "groww-tab-active"
                  : "groww-tab-inactive"
              }`}
            >
              <span className="flex items-center gap-1.5">
                {tab.label}
                {tab.highlight && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#E6F9F5] text-[#00B386] border border-[#00B386]/20 uppercase tracking-wider">
                    New
                  </span>
                )}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};
