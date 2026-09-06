import React, { useState } from "react";

interface NavbarProps {
  onOpenSearch: () => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  userName?: string;
  userEmail?: string;
  onOpenPreferences?: () => void;
  onOpenHelp?: () => void;
  onGoHome?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSearch,
  isRefreshing,
  onRefresh,
  theme,
  onToggleTheme,
  userName = "Trader",
  userEmail = "",
  onOpenPreferences,
  onOpenHelp,
  onGoHome,
  onLogout,
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "DT";

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#EAECF0] shadow-xs transition-colors">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Logo + Sub-brand + Nav Links */}
        <div className="flex items-center gap-6 sm:gap-8">
          {/* Brand Logo */}
          <div
            onClick={onGoHome}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
            title="Return to Smart Watchlist"
          >
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="8" fill="#00D09C" />
              <path
                d="M11 27L18 19L23 23L30 13"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M25 13H30V18"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-[#1E222D] tracking-tight font-display group-hover:text-[#00D09C] transition-colors">
                Groww
              </span>
              <span className="hidden sm:inline-flex text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-[#E6F9F5] text-[#00B386] border border-[#00B386]/30">
                SMART WATCHLIST
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <span
              onClick={onGoHome}
              className="text-[#00B386] font-semibold border-b-2 border-[#00B386] pb-0.5 cursor-pointer"
            >
              Watchlist
            </span>
          </nav>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-[420px] hidden sm:block">
          <div
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#F2F4F7] hover:bg-[#EAECF0] cursor-pointer transition-all text-sm text-[#9CA3AF] border border-transparent hover:border-[#D0D5DD]"
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-[#7C7E8C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search stocks (e.g. INFY, RELIANCE, TCS)...</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-[#7C7E8C] border border-[#EAECF0]">
              /
            </span>
          </div>
        </div>

        {/* Right: Actions, Theme Switcher & Profile */}
        <div className="flex items-center gap-2.5">
          {/* Help & Support Button */}
          {onOpenHelp && (
            <button
              onClick={onOpenHelp}
              className="p-2 rounded-xl text-[#7C7E8C] hover:text-[#00D09C] hover:bg-[#F2F4F7] transition-all flex items-center justify-center cursor-pointer"
              title="Help & Support Guide"
            >
              <svg className="w-[19px] h-[19px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" strokeWidth="2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3m.08 4h.01" />
              </svg>
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl text-[#7C7E8C] hover:text-[#1E222D] hover:bg-[#F2F4F7] transition-all flex items-center justify-center cursor-pointer"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? (
              // Sun icon
              <svg className="w-[19px] h-[19px] text-[#F5A623]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="5" strokeWidth="2" stroke="currentColor" />
                <path strokeLinecap="round" strokeWidth="2" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              // Moon icon
              <svg className="w-[19px] h-[19px] text-[#44475B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl text-[#7C7E8C] hover:text-[#1E222D] hover:bg-[#F2F4F7] transition-colors cursor-pointer"
            title="Refresh snapshot data"
          >
            <svg
              className={`w-[18px] h-[18px] ${isRefreshing ? "animate-spin text-[#00D09C]" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Profile Avatar & Menu */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00D09C] to-[#00B386] text-white font-bold text-xs flex items-center justify-center cursor-pointer shadow-xs"
              title="Profile & Settings"
            >
              {initials}
            </button>

            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-[#EAECF0] shadow-xl p-3 z-50 text-xs animate-fadeIn">
                  <div className="pb-2.5 border-b border-[#F0F2F5]">
                    <div className="font-bold text-[#1E222D]">{userName}</div>
                    <div className="text-[11px] text-[#7C7E8C]">{userEmail}</div>
                    <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#00B386] bg-[#E6F9F5] px-2 py-0.5 rounded-full font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00B386]" />
                      Active Session
                    </div>
                  </div>
                  <div className="py-2 space-y-0.5 text-[#44475B]">
                    <div
                      onClick={() => {
                        setIsProfileOpen(false);
                        onOpenPreferences?.();
                      }}
                      className="p-2 hover:bg-[#F8F9FA] rounded-lg cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <span>Watchlist Preferences</span>
                      <span className="text-[10px] text-[#7C7E8C] font-mono">
                        {theme.toUpperCase()}
                      </span>
                    </div>
                    {onOpenHelp && (
                      <div
                        onClick={() => {
                          setIsProfileOpen(false);
                          onOpenHelp();
                        }}
                        className="p-2 hover:bg-[#F8F9FA] rounded-lg cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <span>Help & Support Guide</span>
                        <span className="text-xs">📖</span>
                      </div>
                    )}
                    <div
                      onClick={() => {
                        setIsProfileOpen(false);
                        onToggleTheme();
                      }}
                      className="p-2 hover:bg-[#F8F9FA] rounded-lg cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <span>Toggle Theme</span>
                      <span>{theme === "dark" ? "☀️ Light" : "🌙 Dark"}</span>
                    </div>
                  </div>
                  <div
                    onClick={() => {
                      setIsProfileOpen(false);
                      onLogout?.();
                    }}
                    className="pt-2 border-t border-[#F0F2F5] text-[#EB5757] cursor-pointer p-2 hover:bg-[#FDF2F2] rounded-lg transition-colors font-medium"
                  >
                    Log Out
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
