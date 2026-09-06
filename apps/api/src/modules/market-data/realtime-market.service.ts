import { query } from "../../infrastructure/postgres/pool.js";
import { v4 as uuid } from "uuid";
import type { ServerResponse } from "http";
import { config } from "../../config/index.js";
import { getMarketDataProvider } from "../../infrastructure/providers/provider.factory.js";
import { growwClient } from "../../infrastructure/providers/groww/groww.client.js";

export function getIndianMarketSessionStatus(): {
  status: "PRE_OPEN" | "OPEN" | "POST_CLOSE" | "CLOSED";
  message: string;
} {
  const now = new Date();
  // IST offset is UTC+5:30
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 3600000 * 5.5);

  const day = ist.getDay(); // 0 = Sun, 6 = Sat
  const hour = ist.getHours();
  const minute = ist.getMinutes();
  const totalMinutes = hour * 60 + minute;

  // Weekend
  if (day === 0 || day === 6) {
    return {
      status: "CLOSED",
      message: "Market closed (Weekend). Regular trading hours: Mon-Fri 09:15 - 15:30 IST.",
    };
  }

  // Pre-open: 09:00 - 09:15 IST
  if (totalMinutes >= 540 && totalMinutes < 555) {
    return {
      status: "PRE_OPEN",
      message: "Market in pre-open session (09:00 - 09:15 IST). Orders being matched.",
    };
  }

  // Regular Trading: 09:15 - 15:30 IST
  if (totalMinutes >= 555 && totalMinutes < 930) {
    return {
      status: "OPEN",
      message: "Market is open. Live trading in progress.",
    };
  }

  // Post-close: 15:30 - 16:00 IST
  if (totalMinutes >= 930 && totalMinutes < 960) {
    return {
      status: "POST_CLOSE",
      message: "Market in post-closing session (15:30 - 16:00 IST).",
    };
  }

  return {
    status: "CLOSED",
    message: "Market closed for the day. Trading resumes next business day at 09:15 IST.",
  };
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

export class RealtimeMarketService {
  private static instance: RealtimeMarketService;
  private stocks: Map<string, StockTick> = new Map();
  private sseClients: Set<ServerResponse> = new Set();
  private timer: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private activeScenario = "NORMAL";
  private tickCounter = 0;

  private constructor() {}

  public static getInstance(): RealtimeMarketService {
    if (!RealtimeMarketService.instance) {
      RealtimeMarketService.instance = new RealtimeMarketService();
    }
    return RealtimeMarketService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 1. Fetch securities with latest real observations from database
      const res = await query<{
        id: string;
        symbol: string;
        name: string;
        sector_name: string | null;
        obs_price: string | null;
        obs_prev_close: string | null;
        obs_volume: string | null;
        obs_day_change: string | null;
        obs_day_change_pct: string | null;
        obs_high: string | null;
        obs_low: string | null;
        obs_time: Date | null;
      }>(
        `SELECT DISTINCT ON (s.id)
           s.id, s.symbol, s.name, sec.name as sector_name,
           mo.price as obs_price, mo.previous_close as obs_prev_close,
           mo.volume as obs_volume, mo.day_change as obs_day_change,
           mo.day_change_pct as obs_day_change_pct, mo.week_52_high as obs_high,
           mo.week_52_low as obs_low, mo.observed_at as obs_time
         FROM securities s
         LEFT JOIN sectors sec ON sec.id = s.sector_id
         LEFT JOIN market_observations mo ON mo.security_id = s.id
         WHERE s.active = true
         ORDER BY s.id, mo.observed_at DESC`
      );

      // 2. Load recent real observation history for each security
      const historyMap = new Map<string, number[]>();
      try {
        const histRes = await query<{ symbol: string; price: string }>(
          `SELECT s.symbol, sub.price
           FROM (
             SELECT mo.security_id, mo.price, mo.observed_at
             FROM market_observations mo
             ORDER BY mo.observed_at DESC
             LIMIT 400
           ) sub
           JOIN securities s ON s.id = sub.security_id
           ORDER BY sub.observed_at ASC`
        );
        for (const h of histRes.rows) {
          const arr = historyMap.get(h.symbol) ?? [];
          arr.push(parseFloat(h.price));
          historyMap.set(h.symbol, arr);
        }
      } catch {
        // Fallback gracefully
      }

      const isDemo = (config.marketDataProvider || "demo").toLowerCase() === "demo";

      const defaultProfiles: Record<string, { price: number; vol: number; h52: number; l52: number }> = {
        INFY: { price: 1512.40, vol: 5400000, h52: 1950, l52: 1350 },
        TCS: { price: 3945.00, vol: 2400000, h52: 4500, l52: 3300 },
        WIPRO: { price: 492.30, vol: 4800000, h52: 560, l52: 380 },
        TECHM: { price: 1320.15, vol: 1800000, h52: 1520, l52: 1080 },
        RELIANCE: { price: 2980.50, vol: 7200000, h52: 3217, l52: 2220 },
        ONGC: { price: 284.60, vol: 12500000, h52: 345, l52: 170 },
        HDFCBANK: { price: 1685.20, vol: 14500000, h52: 1794, l52: 1363 },
        ICICIBANK: { price: 1248.50, vol: 11000000, h52: 1330, l52: 980 },
        SBIN: { price: 812.30, vol: 18000000, h52: 912, l52: 560 },
        KOTAKBANK: { price: 1785.40, vol: 3500000, h52: 1920, l52: 1540 },
        AXISBANK: { price: 1195.00, vol: 6200000, h52: 1340, l52: 950 },
        TATAMOTORS: { price: 985.20, vol: 11200000, h52: 1179, l52: 600 },
        MARUTI: { price: 12450.00, vol: 650000, h52: 13680, l52: 9200 },
        HINDUNILVR: { price: 2450.00, vol: 2100000, h52: 2769, l52: 2170 },
        ITC: { price: 495.10, vol: 9500000, h52: 520, l52: 399 },
        TATASTEEL: { price: 156.40, vol: 25000000, h52: 184, l52: 115 },
        BHARTIARTL: { price: 1642.80, vol: 4800000, h52: 1712, l52: 890 },
        TITAN: { price: 3420.00, vol: 1400000, h52: 3886, l52: 2950 },
        SUNPHARMA: { price: 1740.00, vol: 2200000, h52: 1960, l52: 1100 },
        ZOMATO: { price: 248.60, vol: 32000000, h52: 298, l52: 98 },
      };

      for (const row of res.rows) {
        const realPrice = row.obs_price ? parseFloat(row.obs_price) : null;
        const realPrevClose = row.obs_prev_close ? parseFloat(row.obs_prev_close) : null;

        // In production mode, NEVER use synthetic defaultProfiles or fabricate prices
        if (!isDemo && realPrice === null) {
          continue;
        }

        const p = isDemo
          ? (defaultProfiles[row.symbol] ?? { price: 1000, vol: 1000000, h52: 1400, l52: 700 })
          : null;

        const currentPrice = realPrice ?? p?.price;
        if (!currentPrice) continue;

        const prevClose = realPrevClose ?? (p ? p.price : currentPrice);
        const dayChange = row.obs_day_change ? parseFloat(row.obs_day_change) : 0;
        const dayChangePct = row.obs_day_change_pct ? parseFloat(row.obs_day_change_pct) : 0;
        const volume = row.obs_volume ? parseInt(row.obs_volume, 10) : (p ? p.vol : 0);
        const week52High = row.obs_high ? parseFloat(row.obs_high) : (p ? p.h52 : currentPrice);
        const week52Low = row.obs_low ? parseFloat(row.obs_low) : (p ? p.l52 : currentPrice);

        const dbHistory = historyMap.get(row.symbol);
        const history = dbHistory && dbHistory.length > 0 ? dbHistory.slice(-20) : [currentPrice];

        this.stocks.set(row.symbol, {
          securityId: row.id,
          symbol: row.symbol,
          name: row.name,
          sectorName: row.sector_name || "General",
          currentPrice,
          previousPrice: currentPrice,
          previousClose: prevClose,
          dayChange,
          dayChangePct,
          volume,
          openPrice: prevClose,
          highPrice: currentPrice * 1.01,
          lowPrice: currentPrice * 0.99,
          week52High,
          week52Low,
          tickHistory: history,
          direction: "FLAT",
          lastUpdated: row.obs_time ? row.obs_time.toISOString() : new Date().toISOString(),
        });
      }

      this.isInitialized = true;
      this.startTickLoop();
    } catch (err) {
      console.error("Failed to initialize RealtimeMarketService:", err);
    }
  }

  public setScenario(scenario: string) {
    const isDemo = (config.marketDataProvider || "demo").toLowerCase() === "demo";
    if (!isDemo) {
      console.warn(
        `[RealtimeMarket] Scenarios are disabled in production mode (MARKET_DATA_PROVIDER=${config.marketDataProvider})`
      );
      return;
    }
    this.activeScenario = scenario;
    this.applyScenarioShock();
  }

  public getScenario(): string {
    return this.activeScenario;
  }

  public getSessionInfo() {
    const isDemo = (config.marketDataProvider || "demo").toLowerCase() === "demo";
    const session = getIndianMarketSessionStatus();
    return {
      provider: config.marketDataProvider || "demo",
      isDemoMode: isDemo,
      activeScenario: this.activeScenario,
      hasValidCredentials: growwClient.hasValidCredentials(),
      session: session.status,
      message: session.message,
      timestamp: new Date().toISOString(),
    };
  }

  private startTickLoop() {
    if (this.timer) clearInterval(this.timer);

    const isDemo = (config.marketDataProvider || "demo").toLowerCase() === "demo";
    if (isDemo) {
      // Demo Simulator: runs Brownian motion ticks every 1.5s for judge scenarios
      this.timer = setInterval(() => {
        this.processTick();
      }, 1500);
    } else {
      // Production mode: Poll real Groww provider every 15s during market hours
      this.timer = setInterval(async () => {
        await this.pollProductionQuotes();
      }, 15000);
    }
  }

  public async pollProductionQuotes() {
    try {
      const provider = getMarketDataProvider();
      if (provider.name !== "groww") return;

      if (!growwClient.hasValidCredentials()) {
        // Safe graceful degradation: no fake ticks when credentials missing
        this.realBenchmarkIndex = null;
        return;
      }

      const instruments = Array.from(this.stocks.values()).map((s) => ({
        securityId: s.securityId,
        symbol: s.symbol,
        exchange: "NSE",
        tradingSymbol: `${s.symbol}-EQ`,
      }));

      // Include NIFTY benchmark instrument in provider query
      const benchmarkInstrument = {
        securityId: "00000000-0000-0000-0000-000000000000",
        symbol: "NIFTY",
        exchange: "NSE",
        tradingSymbol: "NIFTY",
      };

      const rawQuotes = await provider.getQuotes([...instruments, benchmarkInstrument]);

      // 1. Process NIFTY benchmark quote if returned by provider
      const niftyQuote = rawQuotes.find(
        (q) => q.symbol === "NIFTY" || q.symbol === "NIFTY 50" || q.symbol === "NIFTY-INDEX"
      );
      if (niftyQuote && niftyQuote.price > 0) {
        const prevClose = niftyQuote.previousClose ?? niftyQuote.price;
        const change =
          niftyQuote.dayChange ?? Number((niftyQuote.price - prevClose).toFixed(2));
        const changePct =
          niftyQuote.dayChangePct ??
          Number(((change / (prevClose || 1)) * 100).toFixed(2));
        this.realBenchmarkIndex = {
          symbol: "NIFTY 50",
          name: "Nifty 50",
          value: niftyQuote.price,
          previousClose: prevClose,
          change,
          changePct,
          isPositive: change >= 0,
        };
      } else {
        this.realBenchmarkIndex = null;
      }

      // 2. Process stock quotes
      for (const q of rawQuotes) {
        if (q.symbol === "NIFTY" || q.symbol === "NIFTY 50" || q.symbol === "NIFTY-INDEX") {
          continue;
        }
        const stock = this.stocks.get(q.symbol.toUpperCase());
        if (!stock) continue;

        stock.previousPrice = stock.currentPrice;
        stock.currentPrice = q.price;
        if (q.previousClose) stock.previousClose = q.previousClose;
        if (q.dayChange !== null) stock.dayChange = q.dayChange;
        if (q.dayChangePct !== null) stock.dayChangePct = q.dayChangePct;
        if (q.volume !== null) stock.volume = q.volume;
        stock.direction =
          stock.currentPrice > stock.previousPrice
            ? "UP"
            : stock.currentPrice < stock.previousPrice
            ? "DOWN"
            : "FLAT";
        stock.tickHistory.push(stock.currentPrice);
        if (stock.tickHistory.length > 30) stock.tickHistory.shift();
        stock.lastUpdated = q.observedAt;
      }
      this.broadcastTick();
    } catch (err) {
      this.realBenchmarkIndex = null;
      console.warn("[ProductionMarket] Provider quote poll warning:", (err as Error).message);
    }
  }

  private applyScenarioShock() {
    const infy = this.stocks.get("INFY");
    const rel = this.stocks.get("RELIANCE");
    const tcs = this.stocks.get("TCS");

    switch (this.activeScenario) {
      case "BIG_MOVE":
        if (infy) {
          infy.currentPrice = Number((infy.previousClose * 0.949).toFixed(2));
          infy.dayChange = Number((infy.currentPrice - infy.previousClose).toFixed(2));
          infy.dayChangePct = Number(((infy.dayChange / infy.previousClose) * 100).toFixed(2));
          infy.volume = Math.round(infy.volume * 2.4);
          infy.direction = "DOWN";
          infy.tickHistory.push(infy.currentPrice);
          if (infy.tickHistory.length > 30) infy.tickHistory.shift();
        }
        break;

      case "MARKET_WIDE_DROP":
        for (const stock of this.stocks.values()) {
          const dropFactor = 0.948 + (Math.random() * 0.008);
          stock.currentPrice = Number((stock.previousClose * dropFactor).toFixed(2));
          stock.dayChange = Number((stock.currentPrice - stock.previousClose).toFixed(2));
          stock.dayChangePct = Number(((stock.dayChange / stock.previousClose) * 100).toFixed(2));
          stock.direction = "DOWN";
          stock.tickHistory.push(stock.currentPrice);
          if (stock.tickHistory.length > 30) stock.tickHistory.shift();
        }
        break;

      case "VOLUME_SPIKE":
        if (rel) {
          rel.currentPrice = Number((rel.previousClose * 1.024).toFixed(2));
          rel.dayChange = Number((rel.currentPrice - rel.previousClose).toFixed(2));
          rel.dayChangePct = Number(((rel.dayChange / rel.previousClose) * 100).toFixed(2));
          rel.volume = Math.round(rel.volume * 3.2);
          rel.direction = "UP";
          rel.tickHistory.push(rel.currentPrice);
          if (rel.tickHistory.length > 30) rel.tickHistory.shift();
        }
        break;

      case "CORPORATE_ACTION":
        if (tcs) {
          tcs.currentPrice = Number((tcs.previousClose * 0.5).toFixed(2));
          tcs.dayChange = Number((tcs.currentPrice - tcs.previousClose).toFixed(2));
          tcs.dayChangePct = -50.0;
          tcs.direction = "DOWN";
        }
        break;

      default:
        break;
    }

    this.broadcastTick();
  }

  private processTick() {
    const isDemo = (config.marketDataProvider || "demo").toLowerCase() === "demo";
    if (!isDemo) return;

    this.tickCounter++;

    // Random walk Brownian motion on each stock (strictly demo mode only)
    for (const stock of this.stocks.values()) {
      stock.previousPrice = stock.currentPrice;

      // Volatility scale
      let volatility = 0.0015; // 0.15% per tick typical
      let drift = 0.0001;

      if (this.activeScenario === "MARKET_WIDE_DROP") {
        drift = -0.0004; // downward bias
      } else if (this.activeScenario === "BIG_MOVE" && stock.symbol === "INFY") {
        drift = -0.0008; // persistent selling pressure
      }

      const randomShock = (Math.random() - 0.49) * 2 * volatility + drift;
      let newPrice = stock.currentPrice * (1 + randomShock);

      // Quantize to standard Indian NSE tick size of ₹0.05
      newPrice = Math.round(newPrice * 20) / 20;

      // Keep within realistic day range bounds
      newPrice = Math.max(stock.week52Low * 0.8, Math.min(stock.week52High * 1.2, newPrice));

      stock.currentPrice = Number(newPrice.toFixed(2));
      stock.dayChange = Number((stock.currentPrice - stock.previousClose).toFixed(2));
      stock.dayChangePct = Number(((stock.dayChange / stock.previousClose) * 100).toFixed(2));
      stock.highPrice = Math.max(stock.highPrice, stock.currentPrice);
      stock.lowPrice = Math.min(stock.lowPrice, stock.currentPrice);

      // Add tick volume
      const tickVol = Math.floor(100 + Math.random() * 2500);
      stock.volume += tickVol;

      if (stock.currentPrice > stock.previousPrice) {
        stock.direction = "UP";
      } else if (stock.currentPrice < stock.previousPrice) {
        stock.direction = "DOWN";
      } else {
        stock.direction = "FLAT";
      }

      stock.tickHistory.push(stock.currentPrice);
      if (stock.tickHistory.length > 30) {
        stock.tickHistory.shift();
      }

      stock.lastUpdated = new Date().toISOString();
    }

    this.broadcastTick();

    // Persist current tick observations to database every 6 ticks (~9 seconds)
    if (this.tickCounter % 6 === 0) {
      this.persistSnapshotToDb().catch((e) => console.error("DB Snapshot sync failed:", e));
    }
  }

  private realBenchmarkIndex: MarketIndex | null = null;

  public getIndices(): MarketIndex[] {
    const isDemo = (config.marketDataProvider || "demo").toLowerCase() === "demo";

    // In production mode, NEVER synthesize indices from hardcoded 24500 / 80200
    if (!isDemo) {
      if (this.realBenchmarkIndex) {
        return [this.realBenchmarkIndex];
      }
      return [];
    }

    const stockList = Array.from(this.stocks.values());
    if (stockList.length === 0) return [];

    // NIFTY 50: weighted avg of constituent changes (demo scenario calculation)
    let totalPct = 0;
    for (const s of stockList) {
      totalPct += s.dayChangePct;
    }
    const avgMarketPct = totalPct / stockList.length;

    const niftyBase = 24500.0;
    const niftyVal = Number((niftyBase * (1 + avgMarketPct / 100)).toFixed(2));
    const niftyChg = Number((niftyVal - niftyBase).toFixed(2));

    // Sensex
    const sensexBase = 80200.0;
    const sensexVal = Number((sensexBase * (1 + avgMarketPct / 100)).toFixed(2));
    const sensexChg = Number((sensexVal - sensexBase).toFixed(2));

    // Bank Nifty
    const bankStocks = stockList.filter((s) =>
      ["HDFCBANK", "ICICIBANK", "SBIN", "KOTAKBANK", "AXISBANK"].includes(s.symbol)
    );
    const bankPct =
      bankStocks.length > 0
        ? bankStocks.reduce((a, b) => a + b.dayChangePct, 0) / bankStocks.length
        : avgMarketPct;
    const bankBase = 51200.0;
    const bankVal = Number((bankBase * (1 + bankPct / 100)).toFixed(2));
    const bankChg = Number((bankVal - bankBase).toFixed(2));

    // NIFTY IT
    const itStocks = stockList.filter((s) => ["TCS", "INFY", "WIPRO", "TECHM"].includes(s.symbol));
    const itPct =
      itStocks.length > 0
        ? itStocks.reduce((a, b) => a + b.dayChangePct, 0) / itStocks.length
        : avgMarketPct;
    const itBase = 35200.0;
    const itVal = Number((itBase * (1 + itPct / 100)).toFixed(2));
    const itChg = Number((itVal - itBase).toFixed(2));

    // India VIX: higher during drop or volatility
    const variance =
      stockList.reduce((acc, s) => acc + Math.pow(s.dayChangePct - avgMarketPct, 2), 0) /
      stockList.length;
    const vixVal = Number(
      (
        12.5 +
        Math.sqrt(variance) * 2.5 +
        (this.activeScenario === "MARKET_WIDE_DROP" ? 8.5 : 0)
      ).toFixed(2)
    );

    return [
      {
        symbol: "NIFTY 50",
        name: "Nifty 50",
        value: niftyVal,
        previousClose: niftyBase,
        change: niftyChg,
        changePct: Number(avgMarketPct.toFixed(2)),
        isPositive: niftyChg >= 0,
      },
      {
        symbol: "SENSEX",
        name: "BSE Sensex",
        value: sensexVal,
        previousClose: sensexBase,
        change: sensexChg,
        changePct: Number(avgMarketPct.toFixed(2)),
        isPositive: sensexChg >= 0,
      },
      {
        symbol: "BANK NIFTY",
        name: "Nifty Bank",
        value: bankVal,
        previousClose: bankBase,
        change: bankChg,
        changePct: Number(bankPct.toFixed(2)),
        isPositive: bankChg >= 0,
      },
      {
        symbol: "NIFTY IT",
        name: "Nifty IT",
        value: itVal,
        previousClose: itBase,
        change: itChg,
        changePct: Number(itPct.toFixed(2)),
        isPositive: itChg >= 0,
      },
      {
        symbol: "INDIA VIX",
        name: "India VIX",
        value: vixVal,
        previousClose: 13.5,
        change: Number((vixVal - 13.5).toFixed(2)),
        changePct: Number((((vixVal - 13.5) / 13.5) * 100).toFixed(2)),
        isPositive: vixVal >= 13.5,
      },
    ];
  }

  public getMovers(): {
    gainers: StockTick[];
    losers: StockTick[];
    mostBought: StockTick[];
  } {
    const isDemo = (config.marketDataProvider || "demo").toLowerCase() === "demo";
    const list = Array.from(this.stocks.values()).filter((s) => s.currentPrice > 0);
    if (!isDemo && list.length === 0) {
      return { gainers: [], losers: [], mostBought: [] };
    }

    const sortedByReturn = [...list].sort((a, b) => b.dayChangePct - a.dayChangePct);
    const sortedByTurnover = [...list].sort(
      (a, b) => b.volume * b.currentPrice - a.volume * a.currentPrice
    );

    return {
      gainers: sortedByReturn.slice(0, 5),
      losers: [...sortedByReturn].reverse().slice(0, 5),
      mostBought: sortedByTurnover.slice(0, 5),
    };
  }

  public getMarketDepth(symbol: string): MarketDepth | null {
    const isDemo = (config.marketDataProvider || "demo").toLowerCase() === "demo";
    // In production mode, NEVER fabricate random order book levels
    if (!isDemo) {
      return null;
    }

    const stock = this.stocks.get(symbol.toUpperCase());
    if (!stock) return null;

    const ltp = stock.currentPrice;
    const bids: OrderBookLevel[] = [];
    const asks: OrderBookLevel[] = [];

    let totalBuyQty = 0;
    let totalSellQty = 0;

    for (let i = 1; i <= 5; i++) {
      const bidPrice = Number((ltp - i * 0.1).toFixed(2));
      const bidQty = Math.floor(500 + Math.random() * 5000);
      const bidOrders = Math.floor(2 + Math.random() * 18);
      bids.push({ price: bidPrice, quantity: bidQty, orders: bidOrders });
      totalBuyQty += bidQty;

      const askPrice = Number((ltp + i * 0.1).toFixed(2));
      const askQty = Math.floor(500 + Math.random() * 5000);
      const askOrders = Math.floor(2 + Math.random() * 18);
      asks.push({ price: askPrice, quantity: askQty, orders: askOrders });
      totalSellQty += askQty;
    }

    return {
      symbol: stock.symbol,
      ltp,
      totalBuyQty,
      totalSellQty,
      bids,
      asks,
    };
  }

  public getLiveStock(symbol: string): StockTick | undefined {
    return this.stocks.get(symbol.toUpperCase());
  }

  public getAllStocks(): StockTick[] {
    return Array.from(this.stocks.values());
  }

  public registerClient(res: ServerResponse) {
    this.sseClients.add(res);

    // Immediately send current state
    const initialPayload = {
      type: "INIT",
      scenario: this.activeScenario,
      indices: this.getIndices(),
      stocks: this.getAllStocks(),
      movers: this.getMovers(),
      timestamp: new Date().toISOString(),
    };
    res.write(`data: ${JSON.stringify(initialPayload)}\n\n`);

    res.on("close", () => {
      this.sseClients.delete(res);
    });
  }

  private broadcastTick() {
    if (this.sseClients.size === 0) return;

    const payload = {
      type: "TICK",
      scenario: this.activeScenario,
      indices: this.getIndices(),
      stocks: this.getAllStocks(),
      timestamp: new Date().toISOString(),
    };

    const data = `data: ${JSON.stringify(payload)}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(data);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  private async persistSnapshotToDb() {
    const list = Array.from(this.stocks.values());
    if (list.length === 0) return;

    const now = new Date();
    for (const s of list) {
      const obsId = uuid();
      await query(
        `INSERT INTO market_observations (
           id, security_id, provider, source_event_id,
           price, volume, day_change, day_change_pct,
           open_price, high_price, low_price, previous_close,
           week_52_high, week_52_low, observed_at, quality_status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          obsId,
          s.securityId,
          "live-realtime",
          `live-${s.symbol}-${now.getTime()}`,
          s.currentPrice,
          s.volume,
          s.dayChange,
          s.dayChangePct,
          s.openPrice,
          s.highPrice,
          s.lowPrice,
          s.previousClose,
          s.week52High,
          s.week52Low,
          now,
          "VALID",
        ]
      );
    }
  }
}

export const realtimeMarketService = RealtimeMarketService.getInstance();
