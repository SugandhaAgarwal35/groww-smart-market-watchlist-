import { config } from "../../../config/index.js";

export interface GrowwOhlc {
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

export interface GrowwQuoteResponse {
  symbol?: string;
  exchange?: string;
  trading_symbol?: string;
  tradingSymbol?: string;
  last_price?: number;
  ltp?: number;
  close_price?: number;
  prev_close?: number;
  open_price?: number;
  high_price?: number;
  low_price?: number;
  volume?: number;
  last_trade_quantity?: number;
  day_change?: number;
  day_change_perc?: number;
  day_change_percentage?: number;
  day_change_pct?: number;
  ohlc?: GrowwOhlc | string;
  week_52_high?: number;
  week_52_low?: number;
  last_trade_time?: string | number;
}

export interface GrowwApiResponse<T = unknown> {
  status: "SUCCESS" | "FAILURE" | "ERROR" | string;
  payload: T;
  error?: {
    code?: string;
    message?: string;
  };
}

export class GrowwClient {
  private baseUrl: string;
  private token: string;

  constructor(customBaseUrl?: string, customToken?: string) {
    this.baseUrl = customBaseUrl ?? config.groww.apiBaseUrl;
    this.token = customToken ?? config.groww.accessToken;
  }

  public hasValidCredentials(): boolean {
    const token = this.token || config.groww.accessToken;
    return Boolean(token && token.trim().length > 0);
  }

  /**
   * Fetch a single instrument quote using official /v1/live-data/quote endpoint.
   * Query parameters: exchange=NSE, segment=CASH, trading_symbol=<symbol>
   */
  public async getQuote(item: {
    symbol: string;
    exchange: string;
    tradingSymbol?: string;
  }): Promise<GrowwQuoteResponse | null> {
    if (!this.hasValidCredentials()) {
      throw new Error(
        "Groww API credentials missing: GROWW_ACCESS_TOKEN is not configured in environment."
      );
    }

    const token = this.token || config.groww.accessToken;
    const tradingSymbol = item.tradingSymbol || `${item.symbol}-EQ`;
    const exchange = item.exchange || "NSE";
    const segment = "CASH";

    const url = `${this.baseUrl}/v1/live-data/quote?exchange=${encodeURIComponent(
      exchange
    )}&segment=${segment}&trading_symbol=${encodeURIComponent(tradingSymbol)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "X-API-VERSION": "1.0",
        "User-Agent": "GrowwSmartWatchlist/1.0",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `Groww API returned HTTP ${response.status}: ${errorBody || response.statusText}`
      );
    }

    const json = (await response.json()) as GrowwApiResponse<
      Record<string, GrowwQuoteResponse> | GrowwQuoteResponse
    >;

    if (json && typeof json === "object") {
      if (json.status === "FAILURE" || json.status === "ERROR") {
        const msg = json.error?.message || "Groww API returned failure status";
        throw new Error(`Groww Live Data API Error: ${msg}`);
      }

      const payload = "payload" in json ? json.payload : json;
      if (payload && typeof payload === "object") {
        if (
          "last_price" in payload ||
          "ltp" in payload ||
          "close_price" in payload ||
          "day_change" in payload ||
          "ohlc" in payload
        ) {
          const res = payload as GrowwQuoteResponse;
          if (!res.symbol) res.symbol = item.symbol;
          if (!res.trading_symbol) res.trading_symbol = tradingSymbol;
          return res;
        }

        const values = Object.values(payload) as GrowwQuoteResponse[];
        if (values.length > 0 && typeof values[0] === "object") {
          const res = values[0];
          if (!res.symbol) res.symbol = item.symbol;
          if (!res.trading_symbol) res.trading_symbol = tradingSymbol;
          return res;
        }
      }
    }

    return null;
  }

  /**
   * Fetch quotes for multiple instruments by issuing individual valid /v1/live-data/quote requests.
   * Employs error isolation so one failed instrument quote does not fail the whole batch.
   */
  public async getBatchQuotes(
    symbols: Array<{ symbol: string; exchange: string; tradingSymbol?: string }>
  ): Promise<GrowwQuoteResponse[]> {
    if (!this.hasValidCredentials()) {
      throw new Error(
        "Groww API credentials missing: GROWW_ACCESS_TOKEN is not configured in environment."
      );
    }

    if (symbols.length === 0) return [];

    const CHUNK_SIZE = 10;
    const results: GrowwQuoteResponse[] = [];

    for (let i = 0; i < symbols.length; i += CHUNK_SIZE) {
      const chunk = symbols.slice(i, i + CHUNK_SIZE);
      const promises = chunk.map(async (item) => {
        try {
          return await this.getQuote(item);
        } catch (err: unknown) {
          console.error(
            `[GrowwClient] Quote fetch error for symbol ${item.tradingSymbol || item.symbol}:`,
            err
          );
          if (symbols.length === 1) {
            throw err;
          }
          return null;
        }
      });

      const chunkResults = await Promise.all(promises);
      for (const res of chunkResults) {
        if (res) results.push(res);
      }
    }

    return results;
  }
}

export const growwClient = new GrowwClient();
