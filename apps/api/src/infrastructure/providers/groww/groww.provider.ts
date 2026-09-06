import type {
  MarketDataProvider,
  ProviderInstrument,
  RawMarketObservation,
} from "../provider.interface.js";
import { growwClient } from "./groww.client.js";
import { mapGrowwQuoteToObservation } from "./groww.mapper.js";

export class GrowwProvider implements MarketDataProvider {
  public readonly name = "groww";
  private client: typeof growwClient;

  constructor(client?: typeof growwClient) {
    this.client = client ?? growwClient;
  }

  public async getQuotes(
    instruments: ProviderInstrument[]
  ): Promise<RawMarketObservation[]> {
    if (!this.client.hasValidCredentials()) {
      throw new Error(
        "Groww Provider Error: Missing GROWW_ACCESS_TOKEN. Configure GROWW_ACCESS_TOKEN in .env or switch MARKET_DATA_PROVIDER=demo."
      );
    }

    const symbols = instruments.map((i) => ({
      symbol: i.symbol,
      exchange: i.exchange,
      tradingSymbol: i.tradingSymbol,
    }));

    const rawQuotes = await this.client.getBatchQuotes(symbols);
    const quoteMap = new Map<string, (typeof rawQuotes)[0]>();

    for (const q of rawQuotes) {
      if (q.symbol) {
        quoteMap.set(q.symbol.toUpperCase(), q);
      }
      if (q.trading_symbol) {
        quoteMap.set(q.trading_symbol.toUpperCase(), q);
        quoteMap.set(q.trading_symbol.replace(/-EQ$/i, "").toUpperCase(), q);
      }
      if (q.tradingSymbol) {
        quoteMap.set(q.tradingSymbol.toUpperCase(), q);
        quoteMap.set(q.tradingSymbol.replace(/-EQ$/i, "").toUpperCase(), q);
      }
    }

    const observations: RawMarketObservation[] = [];
    const now = new Date().toISOString();

    for (const inst of instruments) {
      const q =
        quoteMap.get(inst.symbol.toUpperCase()) ||
        (inst.tradingSymbol ? quoteMap.get(inst.tradingSymbol.toUpperCase()) : undefined) ||
        quoteMap.get(`${inst.symbol.toUpperCase()}-EQ`);

      if (q) {
        observations.push(mapGrowwQuoteToObservation(inst, q, now));
      } else {
        console.warn(`[GrowwProvider] No quote returned for instrument: ${inst.symbol}`);
      }
    }

    return observations;
  }
}

export const growwProvider = new GrowwProvider();
