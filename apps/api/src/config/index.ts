import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    if (process.env["NODE_ENV"] === "test" || process.env["VITEST"]) {
      if (key === "DATABASE_URL") return "postgresql://postgres:postgres@localhost:5432/watchlist";
      if (key === "JWT_SECRET") return "dev-secret-do-not-use-in-production";
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export const config = {
  nodeEnv: optionalEnv("NODE_ENV", "development"),
  port: parseInt(optionalEnv("PORT", "3000"), 10),
  webOrigin: optionalEnv("WEB_ORIGIN", "http://localhost:5173"),

  databaseUrl: requireEnv("DATABASE_URL"),
  redisUrl: optionalEnv("REDIS_URL", "redis://localhost:6379"),

  marketDataProvider: optionalEnv("MARKET_DATA_PROVIDER", "demo"),

  groww: {
    apiBaseUrl: optionalEnv("GROWW_API_BASE_URL", "https://api.groww.in"),
    accessToken: process.env["GROWW_ACCESS_TOKEN"] ?? "",
  },

  marketRefreshIntervalSeconds: parseInt(
    optionalEnv("MARKET_REFRESH_INTERVAL_SECONDS", "30"),
    10
  ),

  significanceRuleVersion: optionalEnv("SIGNIFICANCE_RULE_VERSION", "v1"),

  jwtSecret: requireEnv("JWT_SECRET"),

  freshness: {
    freshMaxSeconds: 60,
    delayedMaxSeconds: 300,
    staleAfterSeconds: 900,
  },

  significance: {
    priceMove: {
      high: 5,
      medium: 2,
    },
    marketRelative: {
      high: 3,
      medium: 1.5,
    },
    sectorRelative: {
      high: 3,
      medium: 1.5,
    },
    volumeRatio: {
      high: 2.5,
      medium: 1.5,
    },
  },
} as const;
