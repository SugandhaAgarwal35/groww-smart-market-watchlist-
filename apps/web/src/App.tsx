import React, { useState, useEffect, useCallback, useMemo } from "react";
import type {
  WatchlistSnapshotResponse,
  Watchlist,
  SnapshotItem,
  ThemePreference,
  DisplayDensity,
} from "@watchlist/contracts";
import { api, type MarketIndex, type StockTick } from "./lib/api.js";
import { Navbar } from "./components/Navbar.js";
import { CategoryTabs } from "./components/CategoryTabs.js";
import { MarketIndicesRibbon } from "./components/MarketIndicesRibbon.js";
import { StocksExplorePage } from "./components/StocksExplorePage.js";
import { Sidebar } from "./components/Sidebar.js";
import { WatchlistDashboard } from "./components/WatchlistDashboard.js";
import { GrowwStockTable } from "./components/GrowwStockTable.js";
import { SecurityCard } from "./components/SecurityCard.js";
import { GrowwDiscover } from "./components/GrowwDiscover.js";
import { Footer } from "./components/Footer.js";
import { SecuritySearchModal } from "./components/SecuritySearchModal.js";
import { StockAnalyticsModal } from "./components/StockAnalyticsModal.js";
import { JudgeDemoControl } from "./components/JudgeDemoControl.js";
import { WatchlistManagerModal } from "./components/WatchlistManagerModal.js";
import { PreferencesModal } from "./components/PreferencesModal.js";
import { ToastNotification, type ToastMessage } from "./components/ToastNotification.js";
import { HelpSupportModal } from "./components/HelpSupportModal.js";

export const App: React.FC = () => {
  const [categoryTab, setCategoryTab] = useState<string>("SMART_WATCHLIST");
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<WatchlistSnapshotResponse | null>(null);
  const [currentScenario, setCurrentScenario] = useState<string>("NORMAL");
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isManageWatchlistsOpen, setIsManageWatchlistsOpen] = useState<boolean>(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [helpTopic, setHelpTopic] = useState<string>("overview");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (type: "success" | "error" | "info", message: string, title?: string) => {
      const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
      setToasts((prev) => [...prev, { id, type, message, title }]);
    },
    []
  );

  // User Profile & Preferences State
  const [userProfile, setUserProfile] = useState<{ id: string; email: string; name: string } | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("app_theme");
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  const [density, setDensity] = useState<DisplayDensity>("comfortable");

  // Market Session & Mode Status
  const [sessionInfo, setSessionInfo] = useState<{
    provider: string;
    isDemoMode: boolean;
    activeScenario: string;
    hasValidCredentials: boolean;
    session: "PRE_OPEN" | "OPEN" | "POST_CLOSE" | "CLOSED";
    message: string;
    timestamp: string;
  } | null>(null);

  // Real-time market states
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [gainers, setGainers] = useState<StockTick[]>([]);
  const [losers, setLosers] = useState<StockTick[]>([]);
  const [mostBought, setMostBought] = useState<StockTick[]>([]);
  const [tickHistoryMap, setTickHistoryMap] = useState<Record<string, number[]>>({});
  const [ticksCount, setTicksCount] = useState<number>(0);
  const [isStreamConnected, setIsStreamConnected] = useState<boolean>(false);
  const [analyticsItem, setAnalyticsItem] = useState<SnapshotItem | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false);

  // Apply theme to document attribute immediately
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("app_theme", theme);
  }, [theme]);

  // Auto-login explicitly controlled by demo/development configuration
  const ensureAuth = useCallback(async () => {
    return await api.ensureAuthenticated();
  }, []);

  // Fetch user profile and preferences
  const loadUserAndPreferences = useCallback(async () => {
    try {
      await ensureAuth();
      const profile = await api.getUserProfile();
      setUserProfile(profile);

      const prefs = await api.getPreferences();
      if (prefs.theme === "dark" || prefs.theme === "light") {
        setTheme(prefs.theme);
      }
      if (prefs.displayDensity) {
        setDensity(prefs.displayDensity);
      }
      if (prefs.defaultWatchlistId && !activeWatchlistId) {
        setActiveWatchlistId(prefs.defaultWatchlistId);
      }
    } catch {
      // Fallback to defaults
    }
  }, [ensureAuth, activeWatchlistId]);

  // Fetch watchlists
  const loadWatchlists = useCallback(async () => {
    try {
      await ensureAuth();
      const list = await api.getWatchlists();
      setWatchlists(list);

      if (list.length > 0 && !activeWatchlistId) {
        setActiveWatchlistId(list[0]!.id);
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message);
    }
  }, [ensureAuth, activeWatchlistId]);

  // Fetch snapshot for active watchlist
  const loadSnapshot = useCallback(
    async (showLoadingSpinner = false) => {
      if (!activeWatchlistId) return;

      if (showLoadingSpinner) setIsLoading(true);
      else setIsRefreshing(true);

      try {
        await ensureAuth();
        const data = await api.getSnapshot(activeWatchlistId);
        setSnapshot(data);
        setErrorMessage(null);
      } catch (err: unknown) {
        setErrorMessage((err as Error).message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeWatchlistId, ensureAuth]
  );

  // Fetch movers for explore page
  const fetchMovers = useCallback(async () => {
    try {
      const data = await api.getMovers();
      setGainers(data.gainers || []);
      setLosers(data.losers || []);
      setMostBought(data.mostBought || []);
    } catch (err) {
      console.error("Failed to load movers:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const initApp = async () => {
      await ensureAuth();
      await Promise.all([
        loadUserAndPreferences(),
        loadWatchlists(),
      ]);
    };

    initApp();
    fetchMovers();
    api.getIndices().then((res) => {
      if (res.indices) setIndices(res.indices);
    }).catch(() => {});
    api.getSessionInfo().then((s) => setSessionInfo(s)).catch(() => {});

    const moverInterval = setInterval(fetchMovers, 5000);
    return () => clearInterval(moverInterval);
  }, [ensureAuth, loadUserAndPreferences, loadWatchlists, fetchMovers]);

  // When active watchlist changes, load snapshot
  useEffect(() => {
    if (activeWatchlistId) {
      loadSnapshot(true);
    }
  }, [activeWatchlistId, loadSnapshot]);

  // ── Real-Time Live Server-Sent Events (SSE) Stream ──────────
  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const connectStream = () => {
      try {
        es = api.createLiveStreamSource();

        es.onopen = () => {
          setIsStreamConnected(true);
        };

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "TICK" || data.type === "INIT") {
              setTicksCount((prev) => prev + 1);

              if (data.indices && data.indices.length > 0) {
                setIndices(data.indices);
              }

              // Update live stock prices & tick histories in current snapshot items
              if (data.stocks && data.stocks.length > 0) {
                const stockMap = new Map<string, StockTick>();
                const newHist: Record<string, number[]> = {};

                for (const s of data.stocks) {
                  stockMap.set(s.symbol, s);
                  if (s.tickHistory && s.tickHistory.length > 0) {
                    newHist[s.symbol] = s.tickHistory;
                  }
                }
                setTickHistoryMap((prev) => ({ ...prev, ...newHist }));

                setSnapshot((prevSnap) => {
                  if (!prevSnap) return prevSnap;

                  let hasUpdates = false;
                  const updatedItems = prevSnap.items.map((item) => {
                    const tick = stockMap.get(item.security.symbol);
                    if (!tick) return item;

                    hasUpdates = true;
                    const baselinePrice = item.seen.baselinePrice;
                    const delta =
                      baselinePrice != null && baselinePrice > 0
                        ? ((tick.currentPrice - baselinePrice) / baselinePrice) * 100
                        : null;
                    const newSinceLastCheck =
                      delta != null
                        ? `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}% (₹${baselinePrice?.toFixed(2)} → ₹${tick.currentPrice.toFixed(2)})`
                        : item.seen.sinceLastCheck;

                    return {
                      ...item,
                      market: {
                        ...item.market,
                        price: tick.currentPrice,
                        dayChange: tick.dayChange,
                        dayChangePct: tick.dayChangePct,
                        volume: tick.volume,
                      },
                      seen: {
                        ...item.seen,
                        sinceLastCheck: newSinceLastCheck,
                      },
                    };
                  });

                  if (!hasUpdates) return prevSnap;
                  return {
                    ...prevSnap,
                    items: updatedItems,
                  };
                });
              }
            }
          } catch (err) {
            console.error("Error parsing stream tick:", err);
          }
        };

        es.onerror = () => {
          setIsStreamConnected(false);
          if (es) {
            es.close();
            es = null;
          }
          retryTimeout = setTimeout(connectStream, 3000);
        };
      } catch {
        setIsStreamConnected(false);
        retryTimeout = setTimeout(connectStream, 3000);
      }
    };

    connectStream();

    return () => {
      if (es) es.close();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);

  // Theme toggle
  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    api.updatePreferences({ theme: nextTheme }).catch(() => {});
  };

  // Preferences save
  const handleSavePreferences = async (newTheme: ThemePreference, newDensity: DisplayDensity) => {
    if (newTheme === "dark" || newTheme === "light") {
      setTheme(newTheme);
    } else {
      const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(sysDark ? "dark" : "light");
    }
    setDensity(newDensity);
    await api.updatePreferences({ theme: newTheme, displayDensity: newDensity });
  };

  // Watchlist CRUD handlers
  const handleCreateWatchlist = async (name: string) => {
    const newWl = await api.createWatchlist(name);
    await loadWatchlists();
    setActiveWatchlistId(newWl.id);
    await api.updatePreferences({ defaultWatchlistId: newWl.id }).catch(() => {});
  };

  const handleRenameWatchlist = async (id: string, newName: string) => {
    await api.renameWatchlist(id, newName);
    await loadWatchlists();
  };

  const handleDeleteWatchlist = async (id: string) => {
    await api.deleteWatchlist(id);
    const remaining = watchlists.filter((w) => w.id !== id);
    setWatchlists(remaining);
    if (remaining.length > 0) {
      setActiveWatchlistId(remaining[0]!.id);
    } else {
      setActiveWatchlistId(null);
    }
    await loadWatchlists();
  };

  // Scenario switch handler
  const handleSelectScenario = async (scenario: string) => {
    setCurrentScenario(scenario);
    try {
      await api.setDemoScenario(scenario);
      await loadSnapshot(false);
    } catch (err) {
      console.error("Scenario error:", err);
    }
  };

  // Mark single security as seen
  const handleMarkSeen = async (item: SnapshotItem) => {
    if (!activeWatchlistId || !item.market.observationId) return;

    try {
      await api.markSeen({
        watchlistId: activeWatchlistId,
        securityId: item.security.id,
        observationId: item.market.observationId,
        baselineVersion: item.seen.baselineVersion,
      });

      showToast("success", `Baseline updated for ${item.security.symbol}.`);
      await loadSnapshot(false);
    } catch (err: unknown) {
      showToast("error", (err as Error).message || "Failed to update seen state");
    }
  };

  // Mark all securities as seen
  const handleMarkAllSeen = async () => {
    if (!activeWatchlistId || !snapshot) return;

    const itemsToMark = snapshot.items
      .filter((i) => i.market.observationId !== null)
      .map((i) => ({
        securityId: i.security.id,
        observationId: i.market.observationId!,
        baselineVersion: i.seen.baselineVersion,
      }));

    if (itemsToMark.length === 0) return;

    setIsMarkingAll(true);
    try {
      await api.markAllSeen(activeWatchlistId, itemsToMark);
      showToast("success", `Acknowledged all ${itemsToMark.length} stocks. Baseline advanced.`);
      await loadSnapshot(false);
    } catch (err: unknown) {
      showToast("error", (err as Error).message || "Failed to mark all as seen");
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Remove security from watchlist
  const handleRemoveSecurity = async (securityId: string) => {
    if (!activeWatchlistId) return;
    const targetItem = snapshot?.items.find((i) => i.security.id === securityId);
    const sym = targetItem?.security.symbol || "Stock";
    try {
      await api.removeSecurity(activeWatchlistId, securityId);
      showToast("success", `Removed ${sym} from your watchlist.`);
      await loadSnapshot(false);
    } catch (err: unknown) {
      showToast("error", (err as Error).message || `Failed to remove ${sym}`);
    }
  };

  // Quick add from Discover or Movers
  const handleAddSecurityById = async (securityId: string) => {
    if (!activeWatchlistId) return;
    try {
      const res = await api.addSecurity(activeWatchlistId, securityId);
      if (res?.status === "already_exists") {
        showToast("info", "Stock is already in this watchlist.");
      } else {
        showToast("success", "Added stock to your watchlist.");
      }
      await loadSnapshot(false);
    } catch (err: unknown) {
      showToast("error", (err as Error).message || "Failed to add security");
    }
  };

  // Open analytics modal by symbol
  const handleSelectStockSymbol = (symbol: string) => {
    const existing = snapshot?.items.find((i) => i.security.symbol === symbol);
    if (existing) {
      setAnalyticsItem(existing);
    } else {
      setIsSearchOpen(true);
    }
  };

  // Filter items based on active quick filter
  const filteredItems = useMemo(() => {
    if (!snapshot?.items) return [];
    switch (activeFilter) {
      case "HIGH":
        return snapshot.items.filter((item) => item.change.attention === "HIGH");
      case "VOLUME":
        return snapshot.items.filter((item) =>
          item.signals?.some((s) => s.type === "VOLUME_ANOMALY")
        );
      case "MOVES":
        return snapshot.items.filter(
          (item) => item.seen.baselinePrice !== null && item.change.state !== "UNCHANGED"
        );
      case "ALL":
      default:
        return snapshot.items;
    }
  }, [snapshot?.items, activeFilter]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F8] text-[#1E222D] font-sans transition-colors">
      {/* 1. Groww White Header */}
      <Navbar
        onOpenSearch={() => setIsSearchOpen(true)}
        isRefreshing={isRefreshing}
        onRefresh={() => loadSnapshot(false)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        userName={userProfile?.name}
        userEmail={userProfile?.email}
        onOpenPreferences={() => setIsPreferencesOpen(true)}
        onOpenHelp={() => {
          setHelpTopic("overview");
          setIsHelpOpen(true);
        }}
        onGoHome={() => {
          setCategoryTab("SMART_WATCHLIST");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onLogout={() => {
          api.setToken(null);
          ensureAuth().then(() => loadWatchlists());
        }}
      />

      {/* 2. Groww Category Switcher Tabs */}
      <CategoryTabs activeTab={categoryTab} onSelectTab={setCategoryTab} />

      {/* 3. Real-time Dynamic Market Indices Ribbon */}
      <MarketIndicesRibbon indices={indices} isLive={isStreamConnected} />

      {/* 4. Main 2-Column Container */}
      <main className="flex-1 max-w-[1240px] w-full mx-auto px-4 sm:px-6 py-6">
        {/* Error notification if any */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-[#FDF2F2] border border-[#EB5757]/30 text-[#EB5757] text-xs flex items-center justify-between">
            <span>{errorMessage}</span>
            <div className="flex items-center gap-2">
              {(errorMessage.includes("authorization") ||
                errorMessage.includes("token") ||
                errorMessage.includes("401") ||
                errorMessage.includes("Authentication required")) && (
                <button
                  onClick={async () => {
                    setErrorMessage(null);
                    api.setToken(null);
                    await api.ensureAuthenticated();
                    await loadWatchlists();
                    await loadUserAndPreferences();
                  }}
                  className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#00D09C] text-white hover:bg-[#00B085] transition-colors cursor-pointer"
                >
                  Reconnect
                </button>
              )}
              <button
                onClick={() => setErrorMessage(null)}
                className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#EB5757] text-white hover:bg-[#D94F4F] transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Column (8 cols on lg) */}
          <div className="lg:col-span-8 space-y-6">
            {/* View: Stocks Explore Page */}
            {categoryTab === "STOCKS" && (
              <>
                {/* Feature Callout Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-[#E6F9F5] to-[#F0FAF7] border border-[#00B386]/30 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#00B386] flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                      ⚡
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#1E222D]">
                        Smart Market Watchlist is Live on Groww!
                      </div>
                      <div className="text-xs text-[#7C7E8C] mt-0.5">
                        Track abnormal deviations and baseline deltas instead of raw price noise.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setCategoryTab("SMART_WATCHLIST")}
                    className="px-4 py-2 rounded-lg bg-[#00B386] text-white text-xs font-semibold hover:bg-[#009E77] whitespace-nowrap shadow-xs transition-all cursor-pointer"
                  >
                    Open Smart Watchlist →
                  </button>
                </div>

                <StocksExplorePage
                  indices={indices}
                  gainers={gainers}
                  losers={losers}
                  mostBought={mostBought}
                  onSelectStock={handleSelectStockSymbol}
                  onAddStock={handleAddSecurityById}
                />
              </>
            )}

            {/* View: Smart Watchlist (Native Feature Tab) */}
            {categoryTab === "SMART_WATCHLIST" && (
              <>
                {/* Watchlist Tabs Row with New/Manage trigger */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#EAECF0]">
                  {watchlists.map((wl) => (
                    <button
                      key={wl.id}
                      onClick={() => {
                        setActiveWatchlistId(wl.id);
                        api.updatePreferences({ defaultWatchlistId: wl.id }).catch(() => {});
                      }}
                      className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        activeWatchlistId === wl.id
                          ? "bg-[#1E222D] text-white shadow-xs"
                          : "text-[#44475B] hover:text-[#1E222D] bg-white border border-[#EAECF0] hover:bg-[#F4F6F8]"
                      }`}
                    >
                      {wl.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setIsManageWatchlistsOpen(true)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold text-[#00B386] hover:bg-[#E6F9F5] border border-dashed border-[#00B386]/40 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span className="text-sm font-bold leading-none">+</span>
                    <span>New / Manage</span>
                  </button>
                  <button
                    onClick={() => setIsSearchOpen(true)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold text-[#44475B] hover:bg-[#F4F6F8] border border-[#EAECF0] transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>+ Add Stock</span>
                  </button>
                </div>

                {/* Watchlist Dashboard (Stats, Baseline, & Filter Controls) */}
                <WatchlistDashboard
                  watchlist={snapshot?.watchlist}
                  summary={snapshot?.summary}
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  onOpenAddSecurity={() => setIsSearchOpen(true)}
                  onMarkAllSeen={handleMarkAllSeen}
                  baselineTime={snapshot?.items?.[0]?.seen?.baselineObservedAt}
                  baselineVersion={snapshot?.items?.[0]?.seen?.baselineVersion}
                  isMarkingAll={isMarkingAll}
                  onOpenManageWatchlists={() => setIsManageWatchlistsOpen(true)}
                  sessionStatus={sessionInfo?.session}
                  sessionMessage={sessionInfo?.message}
                  isDemoMode={sessionInfo?.isDemoMode}
                />

                {/* Loading Skeleton */}
                {isLoading && (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div
                        key={n}
                        className="h-16 rounded-xl bg-white border border-[#EAECF0] animate-pulse"
                      />
                    ))}
                  </div>
                )}

                {/* Empty Watchlist State */}
                {!isLoading && filteredItems.length === 0 && (
                  <div className="p-12 rounded-2xl bg-white border border-[#EAECF0] text-center max-w-md mx-auto my-8 shadow-xs">
                    <div className="w-12 h-12 mx-auto rounded-full bg-[#E6F9F5] border border-[#00B386]/20 flex items-center justify-center text-xl mb-4 text-[#00B386] font-bold">
                      +
                    </div>
                    <h3 className="font-display font-bold text-lg text-[#1E222D]">
                      {activeFilter === "ALL"
                        ? "Your watchlist is empty"
                        : "No matching securities"}
                    </h3>
                    <p className="text-xs text-[#7C7E8C] mt-2">
                      {activeFilter === "ALL"
                        ? "Add securities from NSE like INFY, RELIANCE, TCS to start tracking last-seen intelligence."
                        : "No securities currently meet the selected filter."}
                    </p>
                    {activeFilter === "ALL" && (
                      <button
                        onClick={() => setIsSearchOpen(true)}
                        className="mt-6 px-4 py-2 rounded-lg bg-[#00B386] text-white text-xs font-semibold hover:bg-[#009E77] shadow-xs transition-all mx-auto cursor-pointer"
                      >
                        + Add Securities
                      </button>
                    )}
                  </div>
                )}

                {/* Securities Table or Cards View */}
                {!isLoading && filteredItems.length > 0 && (
                  viewMode === "table" ? (
                    <GrowwStockTable
                      items={filteredItems}
                      watchlistId={activeWatchlistId!}
                      onMarkSeen={handleMarkSeen}
                      onRemove={handleRemoveSecurity}
                      onOpenAnalytics={(item) => setAnalyticsItem(item)}
                      tickHistoryMap={tickHistoryMap}
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredItems.map((item) => (
                        <SecurityCard
                          key={item.security.id}
                          item={item}
                          watchlistId={activeWatchlistId!}
                          onMarkSeen={handleMarkSeen}
                          onRemove={handleRemoveSecurity}
                        />
                      ))}
                    </div>
                  )
                )}

                {/* Groww Discover & Dynamic Real-Time Movers Section */}
                <GrowwDiscover
                  onSelectStock={handleSelectStockSymbol}
                  onAddStock={handleAddSecurityById}
                />
              </>
            )}

            {/* Other Tabs Placeholder with Smart Watchlist Promotion */}
            {categoryTab !== "STOCKS" && categoryTab !== "SMART_WATCHLIST" && (
              <div className="bg-white rounded-2xl border border-[#EAECF0] p-10 text-center space-y-4 shadow-xs">
                <div className="text-4xl">🌱</div>
                <h3 className="text-lg font-bold text-[#1E222D]">
                  {categoryTab === "MUTUAL_FUNDS"
                    ? "Direct Mutual Funds on Groww"
                    : categoryTab === "FNO"
                    ? "Futures & Options Trading"
                    : "US Stocks Investment"}
                </h3>
                <p className="text-xs text-[#7C7E8C] max-w-md mx-auto">
                  Experience zero-commission investing with transparent pricing, instant SIP setup, and direct order execution.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <button
                    onClick={() => setCategoryTab("SMART_WATCHLIST")}
                    className="px-4 py-2 rounded-lg bg-[#00B386] text-white text-xs font-semibold hover:bg-[#009E77] shadow-xs cursor-pointer"
                  >
                    View Smart Market Watchlist →
                  </button>
                  <button
                    onClick={() => setCategoryTab("STOCKS")}
                    className="px-4 py-2 rounded-lg bg-[#F4F6F8] border border-[#EAECF0] text-[#44475B] text-xs font-semibold hover:bg-[#EAECF0] cursor-pointer"
                  >
                    Explore Stocks
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar Column (4 cols on lg) */}
          <div className="lg:col-span-4">
            <Sidebar
              items={snapshot?.items ?? []}
              onSelectStock={handleSelectStockSymbol}
              activeFilter={activeFilter}
              onSelectFilter={setActiveFilter}
            />
          </div>
        </div>
      </main>

      {/* 5. MarketMemory Attention-Aware Footer */}
      <Footer
        onSelectTab={setCategoryTab}
        onOpenHelp={(topic) => {
          if (topic) setHelpTopic(topic);
          setIsHelpOpen(true);
        }}
        onOpenManageWatchlists={() => setIsManageWatchlistsOpen(true)}
        onOpenPreferences={() => setIsPreferencesOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* 6. Add Security Modal */}
      {activeWatchlistId && (
        <SecuritySearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          watchlistId={activeWatchlistId}
          existingSecurityIds={snapshot?.items.map((i) => i.security.id) ?? []}
          onAdded={(sec, status) => {
            if (status === "already_exists") {
              showToast("info", `${sec.symbol} is already in your watchlist.`);
            } else {
              showToast("success", `Added ${sec.symbol} to your watchlist.`);
            }
            loadSnapshot(false);
          }}
        />
      )}

      {/* 7. Watchlist Manager Modal */}
      <WatchlistManagerModal
        isOpen={isManageWatchlistsOpen}
        onClose={() => setIsManageWatchlistsOpen(false)}
        watchlists={watchlists}
        activeWatchlistId={activeWatchlistId}
        onSelectWatchlist={(id) => {
          setActiveWatchlistId(id);
          api.updatePreferences({ defaultWatchlistId: id }).catch(() => {});
        }}
        onCreateWatchlist={handleCreateWatchlist}
        onRenameWatchlist={handleRenameWatchlist}
        onDeleteWatchlist={handleDeleteWatchlist}
      />

      {/* 8. User Preferences Modal */}
      <PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        currentTheme={theme}
        currentDensity={density}
        onSavePreferences={handleSavePreferences}
      />

      {/* 9. 5-Level Market Depth & Stock Analytics Modal */}
      <StockAnalyticsModal
        item={analyticsItem}
        isOpen={Boolean(analyticsItem)}
        onClose={() => setAnalyticsItem(null)}
        onMarkSeen={handleMarkSeen}
      />

      {/* 10. Hackathon Evaluation & Scenario Controller Floating Widget */}
      <JudgeDemoControl
        currentScenario={currentScenario}
        onSelectScenario={handleSelectScenario}
        onMarkAllSeen={handleMarkAllSeen}
        ticksReceived={ticksCount}
        isStreamConnected={isStreamConnected}
      />

      {/* 11. In-App Toast Notifications */}
      <ToastNotification
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />

      {/* 12. Help & Support Knowledge Base Modal */}
      <HelpSupportModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        initialTopic={helpTopic}
        onOpenManageWatchlists={() => setIsManageWatchlistsOpen(true)}
        onOpenPreferences={() => setIsPreferencesOpen(true)}
      />
    </div>
  );
};

export default App;
