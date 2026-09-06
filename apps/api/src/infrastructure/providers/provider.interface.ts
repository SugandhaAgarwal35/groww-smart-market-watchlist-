export interface ProviderInstrument {
  securityId: string;
  symbol: string;
  exchange: string;
  tradingSymbol: string;
}

export interface RawMarketObservation {
  securityId: string;
  symbol: string;
  exchange: string;
  provider: string;
  sourceEventId: string | null;
  price: number;
  volume: number | null;
  dayChange: number | null;
  dayChangePct: number | null;
  openPrice: number | null;
  highPrice: number | null;
  lowPrice: number | null;
  previousClose: number | null;
  week52High: number | null;
  week52Low: number | null;
  observedAt: string; // ISO 8601
}

export interface MarketDataProvider {
  name: string;
  getQuotes(instruments: ProviderInstrument[]): Promise<RawMarketObservation[]>;
}
