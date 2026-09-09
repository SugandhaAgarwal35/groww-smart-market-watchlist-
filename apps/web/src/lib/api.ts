import type {
  WatchlistSnapshotResponse,
  Watchlist,
  SecuritySearchResult,
  AuthResponse,
  UserPreferences,
  UpdateUserPreferencesRequest,
} from "@watchlist/contracts";

const API_BASE = "/api/v1";

export interface RequestOptions extends RequestInit {
  _retried?: boolean;
  maxRetries?: number;
  onRetry?: (attempt: number, maxAttempts: number) => void;
}

export function isHtmlContent(text: string, contentType: string | null): boolean {
  if (contentType && contentType.toLowerCase().includes("text/html")) {
    return true;
  }
  const trimmed = text.trim().toLowerCase();
  return (
    trimmed.startsWith("<!doctype") ||
    trimmed.startsWith("<html") ||
    trimmed.includes("<body") ||
    trimmed.includes("</html>")
  );
}

export function isTemporaryFailure(status: number, isHtml: boolean): boolean {
  return status === 502 || status === 503 || status === 504 || (status >= 500 && isHtml);
}

export class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = typeof localStorage !== "undefined" ? localStorage.getItem("auth_token") : null;
  }

  public setToken(token: string | null) {
    this.token = token;
    if (typeof localStorage !== "undefined") {
      if (token) {
        localStorage.setItem("auth_token", token);
      } else {
        localStorage.removeItem("auth_token");
      }
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private authPromise: Promise<string | null> | null = null;

  public async ensureAuthenticated(): Promise<string | null> {
    if (this.token) return this.token;
    if (this.authPromise) return this.authPromise;

    const demoEmail =
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_DEMO_EMAIL) || "demo@groww.in";
    const demoPassword =
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_DEMO_PASSWORD) || "Password123!";
    const isDemoDisabled =
      typeof import.meta !== "undefined" && import.meta.env?.VITE_ENABLE_DEMO_AUTH === "false";

    if (!isDemoDisabled) {
      this.authPromise = (async () => {
        try {
          const res = await this.login(demoEmail, demoPassword);
          return res.token;
        } catch (err) {
          console.error("Auto login error:", err);
          throw err;
        } finally {
          this.authPromise = null;
        }
      })();
      return this.authPromise;
    }
    return null;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const isPublicEndpoint =
      endpoint.startsWith("/auth/") ||
      endpoint.startsWith("/health/") ||
      endpoint.startsWith("/market/session") ||
      endpoint.startsWith("/market/indices") ||
      endpoint.startsWith("/market/movers") ||
      endpoint.startsWith("/securities/");

    const maxRetries = options.maxRetries ?? 2; // Default 2 retries (total 3 attempts)
    const retryDelays = [3000, 5000];
    let attempt = 0;

    while (true) {
      attempt++;

      if (!this.token && !isPublicEndpoint) {
        try {
          await this.ensureAuthenticated();
        } catch (authErr) {
          const authErrMsg = (authErr as Error).message || "";
          if (
            attempt <= maxRetries &&
            (authErrMsg.includes("Network") ||
              authErrMsg.includes("waking up") ||
              authErrMsg.includes("status 5") ||
              authErrMsg.includes("502") ||
              authErrMsg.includes("503") ||
              authErrMsg.includes("504"))
          ) {
            options.onRetry?.(attempt, maxRetries + 1);
            await new Promise((r) => setTimeout(r, retryDelays[attempt - 1] ?? 5000));
            continue;
          }
          throw new Error(`Authentication failed: ${authErrMsg || "Unable to sign in"}`);
        }
      }

      const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
      };

      if (this.token) {
        headers["Authorization"] = `Bearer ${this.token}`;
      }

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
        if (attempt <= maxRetries) {
          options.onRetry?.(attempt, maxRetries + 1);
          await new Promise((r) => setTimeout(r, retryDelays[attempt - 1] ?? 5000));
          continue;
        }
        throw new Error("Service is waking up. Please try again in a few seconds.");
      }

      // Handle 204 No Content or 205 Reset Content (successful bodyless responses)
      if (res.status === 204 || res.status === 205) {
        return undefined as unknown as T;
      }

      // Safely parse body text/JSON
      const text = await res.text();
      const contentType = res.headers.get("content-type");
      const isHtml = isHtmlContent(text, contentType);

      let data: unknown;
      let parseFailed = false;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          parseFailed = true;
          data = {
            message: isHtml
              ? "Service is waking up. Please try again in a few seconds."
              : text,
          };
        }
      }

      // If temporary server error (502, 503, 504, or non-JSON HTML page from proxy), retry
      const isTemporary =
        !res.ok && (isTemporaryFailure(res.status, isHtml) || (res.status >= 500 && parseFailed));
      if (isTemporary || isHtml) {
        if (attempt <= maxRetries) {
          options.onRetry?.(attempt, maxRetries + 1);
          await new Promise((r) => setTimeout(r, retryDelays[attempt - 1] ?? 5000));
          continue;
        }
      }

      if (!res.ok) {
        // Auto-recover from 401 by clearing stale token, re-authenticating, and retrying once
        if (res.status === 401 && !isPublicEndpoint && !options._retried) {
          this.setToken(null);
          const newToken = await this.ensureAuthenticated();
          if (newToken) {
            return await this.request<T>(endpoint, {
              ...options,
              _retried: true,
            });
          }
        }

        const errorObj = data as { error?: { message?: string; code?: string }; message?: string };
        let errorMsg = errorObj?.error?.message || errorObj?.message;

        // Never expose raw HTML or proxy error bodies to the user
        if (!errorMsg || isHtmlContent(errorMsg, null)) {
          errorMsg =
            res.status >= 500
              ? "Service is waking up. Please try again in a few seconds."
              : res.status === 401
              ? "Authentication required or session expired"
              : `Request failed with status ${res.status}`;
        }

        const err = new Error(errorMsg);
        (err as unknown as { code?: string; status?: number }).code = errorObj?.error?.code;
        (err as unknown as { code?: string; status?: number }).status = res.status;
        throw err;
      }

      return data as T;
    }
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
  public async getWatchlists(options?: RequestOptions): Promise<Watchlist[]> {
    return this.request<Watchlist[]>("/watchlists", options);
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
  public async getSnapshot(watchlistId: string, options?: RequestOptions): Promise<WatchlistSnapshotResponse> {
    return this.request<WatchlistSnapshotResponse>(`/watchlists/${watchlistId}/snapshot`, options);
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
  public async searchSecurities(
    query: string,
    options?: RequestOptions
  ): Promise<SecuritySearchResult[]> {
    return this.request<SecuritySearchResult[]>(
      `/securities/search?q=${encodeURIComponent(query)}`,
      options
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

