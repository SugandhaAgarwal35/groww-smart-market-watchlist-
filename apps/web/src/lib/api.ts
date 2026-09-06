import type {
  WatchlistSnapshotResponse,
  Watchlist,
  SecuritySearchResult,
  AuthResponse,
  UserPreferences,
  UpdateUserPreferencesRequest,
} from "@watchlist/contracts";

const API_BASE = "/api/v1";

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem("auth_token");
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem("auth_token", token);
    } else {
      localStorage.removeItem("auth_token");
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    // Only attach Content-Type: application/json when body is present and not already set
    if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    let res: Response;
    try {
      res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });
    } catch (networkErr: unknown) {
      throw new Error(`Network connection error: ${(networkErr as Error).message || "Unable to reach server"}`);
    }

    // Handle 204 No Content or 205 Reset Content (successful bodyless responses)
    if (res.status === 204 || res.status === 205) {
      return undefined as unknown as T;
    }

    // Safely parse body text/JSON
    const text = await res.text();
    let data: unknown;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    if (!res.ok) {
      const errorObj = data as { error?: { message?: string; code?: string }; message?: string };
      const errorMsg =
        errorObj?.error?.message ||
        errorObj?.message ||
        (res.status === 401
          ? "Authentication required or session expired"
          : `Request failed with status ${res.status}`);
      const err = new Error(errorMsg);
      (err as unknown as { code?: string; status?: number }).code = errorObj?.error?.code;
      (err as unknown as { code?: string; status?: number }).status = res.status;
      throw err;
    }

    return data as T;
  }

  // ── Auth ──────────────────────────────────────────
  public async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  public async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    this.setToken(data.token);
    return data;
  }

  // ── Watchlists ────────────────────────────────────
  public async getWatchlists(): Promise<Watchlist[]> {
    return this.request<Watchlist[]>("/watchlists");
  }

  public async createWatchlist(name: string): Promise<Watchlist> {
    return this.request<Watchlist>("/watchlists", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  public async renameWatchlist(id: string, name: string): Promise<Watchlist> {
    return this.request<Watchlist>(`/watchlists/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
  }

  public async deleteWatchlist(id: string): Promise<void> {
    await this.request(`/watchlists/${id}`, {
      method: "DELETE",
    });
  }

  // ── Watchlist Items ───────────────────────────────
  public async addSecurity(watchlistId: string, securityId: string): Promise<{ id?: string; status?: string }> {
    return this.request<{ id?: string; status?: string }>(`/watchlists/${watchlistId}/items`, {
      method: "POST",
      body: JSON.stringify({ securityId }),
    });
  }

  public async removeSecurity(watchlistId: string, securityId: string): Promise<void> {
    await this.request(`/watchlists/${watchlistId}/items/${securityId}`, {
      method: "DELETE",
    });
  }

  // ── Snapshot (Hero Endpoint) ──────────────────────
  public async getSnapshot(watchlistId: string): Promise<WatchlistSnapshotResponse> {
    return this.request<WatchlistSnapshotResponse>(`/watchlists/${watchlistId}/snapshot`);
  }

  // ── Seen State ────────────────────────────────────
  public async markSeen(params: {
    watchlistId: string;
    securityId: string;
    observationId: string;
    observedAt?: string;
    baselineVersion: number;
  }): Promise<{ status: string; newVersion: number }> {
    return this.request<{ status: string; newVersion: number }>(
      `/watchlists/${params.watchlistId}/items/${params.securityId}/seen`,
      {
        method: "POST",
        body: JSON.stringify({
          observationId: params.observationId,
          observedAt: params.observedAt,
          baselineVersion: params.baselineVersion,
        }),
      }
    );
  }

  public async markAllSeen(
    watchlistId: string,
    items: Array<{ securityId: string; observationId: string; baselineVersion: number }>
  ): Promise<{ status: string; updatedCount: number }> {
    return this.request<{ status: string; updatedCount: number }>(
      `/watchlists/${watchlistId}/seen-all`,
      {
        method: "POST",
        body: JSON.stringify({ items }),
      }
    );
  }

  // ── Securities Search ─────────────────────────────
  public async searchSecurities(query: string): Promise<SecuritySearchResult[]> {
    return this.request<SecuritySearchResult[]>(
      `/securities/search?q=${encodeURIComponent(query)}`
    );
  }

  // ── Demo Scenarios ────────────────────────────────
  public async getDemoScenarios(): Promise<{
    currentScenario: string;
    scenarios: Record<string, { name: string; description: string; expectedAttention: string; expectedConfidence: string }>;
  }> {
    return this.request("/watchlists/demo/scenarios");
  }

  public async setDemoScenario(scenario: string): Promise<{ status: string; scenario: string }> {
    return this.request("/watchlists/demo/scenario", {
      method: "POST",
      body: JSON.stringify({ scenario }),
    });
  }

  // ── Real-Time Market Live Stream & Analytics ────────
  public async getIndices(): Promise<{ indices: MarketIndex[]; timestamp: string }> {
    return this.request("/market/indices");
  }

  public async getMovers(): Promise<{
    gainers: StockTick[];
    losers: StockTick[];
    mostBought: StockTick[];
    timestamp: string;
  }> {
    return this.request("/market/movers");
  }

  public async getMarketDepth(symbol: string): Promise<MarketDepth> {
    return this.request(`/market/depth/${symbol}`);
  }

  public createLiveStreamSource(): EventSource {
    return new EventSource(`${API_BASE}/market/live-stream`);
  }

  // ── User Profile & Preferences ────────────────────
  public async getUserProfile(): Promise<{ id: string; email: string; name: string }> {
    return this.request<{ id: string; email: string; name: string }>("/users/me");
  }

  public async getPreferences(): Promise<UserPreferences> {
    return this.request<UserPreferences>("/users/preferences");
  }

  public async updatePreferences(updates: UpdateUserPreferencesRequest): Promise<UserPreferences> {
    return this.request<UserPreferences>("/users/preferences", {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  // ── Market Session & History ──────────────────────
  public async getSessionInfo(): Promise<{
    provider: string;
    isDemoMode: boolean;
    activeScenario: string;
    hasValidCredentials: boolean;
    session: "PRE_OPEN" | "OPEN" | "POST_CLOSE" | "CLOSED";
    message: string;
    timestamp: string;
  }> {
    return this.request("/market/session");
  }

  public async getObservationHistory(symbol: string): Promise<{
    symbol: string;
    points: Array<{
      price: number;
      volume: number | null;
      dayChange: number | null;
      dayChangePct: number | null;
      observedAt: string;
    }>;
    count: number;
  }> {
    return this.request(`/market/history/${encodeURIComponent(symbol)}`);
  }

  public async reorderWatchlistItems(watchlistId: string, securityIds: string[]): Promise<void> {
    await this.request(`/watchlists/${watchlistId}/items/reorder`, {
      method: "PATCH",
      body: JSON.stringify({ securityIds }),
    });
  }
}

export interface StockTick {
  securityId: string;
  symbol: string;
  name: string;
  sectorName: string;
  currentPrice: number;
  previousPrice: number;
  previousClose: number;
  dayChange: number;
  dayChangePct: number;
  volume: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  week52High: number;
  week52Low: number;
  tickHistory: number[];
  direction: "UP" | "DOWN" | "FLAT";
  lastUpdated: string;
}

export interface MarketIndex {
  symbol: string;
  name: string;
  value: number;
  previousClose: number;
  change: number;
  changePct: number;
  isPositive: boolean;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  orders: number;
}

export interface MarketDepth {
  symbol: string;
  ltp: number;
  totalBuyQty: number;
  totalSellQty: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export const api = new ApiClient();

