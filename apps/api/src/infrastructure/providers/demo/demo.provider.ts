import type {
  MarketDataProvider,
  ProviderInstrument,
  RawMarketObservation,
} from "../provider.interface.js";
import type { DemoScenarioName } from "./scenarios.js";

interface SecurityProfile {
  basePrice: number;
  expectedVolume: number;
  week52High: number;
  week52Low: number;
}

const SECURITY_PROFILES: Record<string, SecurityProfile> = {
  INFY: {
    basePrice: 1500.0,
    expectedVolume: 4_500_000,
    week52High: 1950.0,
    week52Low: 1350.0,
  },
  RELIANCE: {
    basePrice: 2850.0,
    expectedVolume: 6_200_000,
    week52High: 3100.0,
    week52Low: 2200.0,
  },
  HDFCBANK: {
    basePrice: 1650.0,
    expectedVolume: 12_000_000,
    week52High: 1790.0,
    week52Low: 1380.0,
  },
  TCS: {
    basePrice: 3800.0,
    expectedVolume: 2_100_000,
    week52High: 4500.0,
    week52Low: 3300.0,
  },
  ICICIBANK: {
    basePrice: 1250.0,
    expectedVolume: 9_000_000,
    week52High: 1330.0,
    week52Low: 980.0,
  },
  SBIN: {
    basePrice: 780.0,
    expectedVolume: 14_000_000,
    week52High: 910.0,
    week52Low: 560.0,
  },
  WIPRO: {
    basePrice: 492.30,
    expectedVolume: 4_800_000,
    week52High: 560.0,
    week52Low: 380.0,
  },
  TECHM: {
    basePrice: 1320.15,
    expectedVolume: 1_800_000,
    week52High: 1520.0,
    week52Low: 1080.0,
  },
  ONGC: {
    basePrice: 284.60,
    expectedVolume: 12_500_000,
    week52High: 345.0,
    week52Low: 170.0,
  },
  KOTAKBANK: {
    basePrice: 1785.40,
    expectedVolume: 3_500_000,
    week52High: 1920.0,
    week52Low: 1540.0,
  },
  AXISBANK: {
    basePrice: 1195.00,
    expectedVolume: 6_200_000,
    week52High: 1340.0,
    week52Low: 950.0,
  },
  TATAMOTORS: {
    basePrice: 985.20,
    expectedVolume: 11_200_000,
    week52High: 1179.0,
    week52Low: 600.0,
  },
  MARUTI: {
    basePrice: 12450.00,
    expectedVolume: 650_000,
    week52High: 13680.0,
    week52Low: 9200.0,
  },
  HINDUNILVR: {
    basePrice: 2450.00,
    expectedVolume: 2_100_000,
    week52High: 2769.0,
    week52Low: 2170.0,
  },
  ITC: {
    basePrice: 495.10,
    expectedVolume: 9_500_000,
    week52High: 520.0,
    week52Low: 399.0,
  },
  TATASTEEL: {
    basePrice: 156.40,
    expectedVolume: 25_000_000,
    week52High: 184.0,
    week52Low: 115.0,
  },
  BHARTIARTL: {
    basePrice: 1642.80,
    expectedVolume: 4_800_000,
    week52High: 1712.0,
    week52Low: 890.0,
  },
  TITAN: {
    basePrice: 3420.00,
    expectedVolume: 1_400_000,
    week52High: 3886.0,
    week52Low: 2950.0,
  },
  SUNPHARMA: {
    basePrice: 1740.00,
    expectedVolume: 2_200_000,
    week52High: 1960.0,
    week52Low: 1100.0,
  },
  ZOMATO: {
    basePrice: 248.60,
    expectedVolume: 32_000_000,
    week52High: 298.0,
    week52Low: 98.0,
  },
};

export class DemoProvider implements MarketDataProvider {
  public readonly name = "demo";
  private currentScenario: DemoScenarioName = "BIG_MOVE";

  public setScenario(scenario: DemoScenarioName) {
    this.currentScenario = scenario;
  }

  public getScenario(): DemoScenarioName {
    return this.currentScenario;
  }

  public async getQuotes(
    instruments: ProviderInstrument[]
  ): Promise<RawMarketObservation[]> {
    const now = new Date();
    const results: RawMarketObservation[] = [];

    for (const inst of instruments) {
      const profile = SECURITY_PROFILES[inst.symbol] ?? {
        basePrice: 1000.0,
        expectedVolume: 1_000_000,
        week52High: 1500.0,
        week52Low: 750.0,
      };

      let price = profile.basePrice;
      let volume = profile.expectedVolume;
      let observedAt = now.toISOString();

      switch (this.currentScenario) {
        case "BIG_MOVE":
          if (inst.symbol === "INFY") {
            // -5.1% crash with 2.4x volume
            price = Number((profile.basePrice * 0.949).toFixed(2));
            volume = Math.round(profile.expectedVolume * 2.4);
          } else {
            // Routine move for others (-0.4%)
            price = Number((profile.basePrice * 0.996).toFixed(2));
            volume = profile.expectedVolume;
          }
          break;

        case "MARKET_WIDE_DROP":
          // Everything down ~4.9% - 5.1%
          price = Number((profile.basePrice * 0.951).toFixed(2));
          volume = Math.round(profile.expectedVolume * 1.8);
          break;

        case "VOLUME_SPIKE":
          if (inst.symbol === "RELIANCE") {
            price = Number((profile.basePrice * 1.018).toFixed(2));
            volume = Math.round(profile.expectedVolume * 3.2);
          } else {
            price = Number((profile.basePrice * 1.002).toFixed(2));
            volume = profile.expectedVolume;
          }
          break;

        case "DATA_DELAY":
          // Observed 20 minutes ago
          observedAt = new Date(now.getTime() - 20 * 60 * 1000).toISOString();
          price = Number((profile.basePrice * 1.005).toFixed(2));
          break;

        case "DATA_CONFLICT":
          if (inst.symbol === "INFY") {
            // Big swing
            price = Number((profile.basePrice * 1.045).toFixed(2));
          } else {
            price = Number((profile.basePrice * 0.99).toFixed(2));
          }
          break;

        case "CORPORATE_ACTION":
          if (inst.symbol === "TCS") {
            // 2:1 split -> naive price drops to half
            price = Number((profile.basePrice * 0.5).toFixed(2));
          } else {
            price = Number((profile.basePrice * 1.004).toFixed(2));
          }
          break;

        case "LATE_OBSERVATION":
          // Observed 10 minutes ago
          observedAt = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
          price = Number((profile.basePrice * 0.998).toFixed(2));
          break;

        case "NORMAL":
        default:
          try {
            const { realtimeMarketService } = await import("../../../modules/market-data/realtime-market.service.js");
            const liveStock = realtimeMarketService.getLiveStock(inst.symbol);
            if (liveStock) {
              price = liveStock.currentPrice;
              volume = liveStock.volume;
            } else {
              const randomFactor = 1 + ((Math.random() - 0.49) * 0.012);
              price = Number((profile.basePrice * randomFactor).toFixed(2));
              volume = Math.round(profile.expectedVolume * (0.95 + Math.random() * 0.1));
            }
          } catch {
            const randomFactor = 1 + ((Math.random() - 0.49) * 0.012);
            price = Number((profile.basePrice * randomFactor).toFixed(2));
            volume = Math.round(profile.expectedVolume * (0.95 + Math.random() * 0.1));
          }
          break;
      }

      const dayChange = Number((price - profile.basePrice).toFixed(2));
      const dayChangePct = Number(((dayChange / profile.basePrice) * 100).toFixed(2));

      results.push({
        securityId: inst.securityId,
        symbol: inst.symbol,
        exchange: inst.exchange,
        provider: this.name,
        sourceEventId: `demo-${inst.symbol}-${this.currentScenario}-${now.getTime()}`,
        price,
        volume,
        dayChange,
        dayChangePct,
        openPrice: profile.basePrice,
        highPrice: Math.max(price, profile.basePrice),
        lowPrice: Math.min(price, profile.basePrice),
        previousClose: profile.basePrice,
        week52High: profile.week52High,
        week52Low: profile.week52Low,
        observedAt,
      });
    }

    return results;
  }
}

export const demoProvider = new DemoProvider();
