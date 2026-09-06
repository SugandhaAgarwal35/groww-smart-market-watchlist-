import { config } from "../../config/index.js";
import type { MarketDataProvider } from "./provider.interface.js";
import { demoProvider } from "./demo/demo.provider.js";
import { growwProvider } from "./groww/groww.provider.js";

export function getMarketDataProvider(): MarketDataProvider {
  const providerName = (config.marketDataProvider || "demo").toLowerCase();

  switch (providerName) {
    case "groww":
      return growwProvider;
    case "demo":
    default:
      return demoProvider;
  }
}

export { demoProvider, growwProvider };
