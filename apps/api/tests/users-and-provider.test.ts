import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { getMarketDataProvider } from "../src/infrastructure/providers/provider.factory.js";
import { mapGrowwQuoteToObservation } from "../src/infrastructure/providers/groww/groww.mapper.js";
import type { FastifyInstance } from "fastify";

describe("Users & Provider Architecture Tests", () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Login as demo user
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "demo@groww.in",
        password: "Password123!",
      },
    });

    const body = JSON.parse(res.body);
    token = body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  it("should retrieve user profile and default preferences", async () => {
    const meRes = await app.inject({
      method: "GET",
      url: "/api/v1/users/me",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(meRes.statusCode).toBe(200);
    const me = JSON.parse(meRes.body);
    expect(me.email).toBe("demo@groww.in");
    expect(me.name).toBe("Demo Trader");

    const prefRes = await app.inject({
      method: "GET",
      url: "/api/v1/users/preferences",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(prefRes.statusCode).toBe(200);
    const prefs = JSON.parse(prefRes.body);
    expect(prefs.theme).toBeDefined();
  });

  it("should update and persist user theme preference", async () => {
    const updateRes = await app.inject({
      method: "PUT",
      url: "/api/v1/users/preferences",
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        theme: "dark",
        displayDensity: "compact",
      },
    });

    expect(updateRes.statusCode).toBe(200);
    const updated = JSON.parse(updateRes.body);
    expect(updated.theme).toBe("dark");
    expect(updated.displayDensity).toBe("compact");

    // Verify persistence on subsequent GET
    const verifyRes = await app.inject({
      method: "GET",
      url: "/api/v1/users/preferences",
      headers: { Authorization: `Bearer ${token}` },
    });

    const verify = JSON.parse(verifyRes.body);
    expect(verify.theme).toBe("dark");
  });

  it("should properly map Groww raw quote into normalized market observation", () => {
    const inst = {
      securityId: "20000000-0000-0000-0000-000000000001",
      symbol: "INFY",
      exchange: "NSE",
      tradingSymbol: "INFY-EQ",
    };

    const quote = {
      symbol: "INFY",
      exchange: "NSE",
      last_price: 1520.5,
      close_price: 1500.0,
      open_price: 1505.0,
      high_price: 1530.0,
      low_price: 1495.0,
      volume: 6200000,
      week_52_high: 1950.0,
      week_52_low: 1350.0,
      last_trade_time: "2026-09-06T10:30:00.000Z",
    };

    const obs = mapGrowwQuoteToObservation(inst, quote);
    expect(obs.symbol).toBe("INFY");
    expect(obs.price).toBe(1520.5);
    expect(obs.previousClose).toBe(1500.0);
    expect(obs.dayChange).toBe(20.5);
    expect(obs.dayChangePct).toBe(1.37);
    expect(obs.provider).toBe("groww");
    expect(obs.observedAt).toBe("2026-09-06T10:30:00.000Z");
  });

  it("provider factory should resolve demo provider in test environment", () => {
    const provider = getMarketDataProvider();
    expect(provider).toBeDefined();
    expect(provider.name).toBe("demo");
  });

  it("should serve session status from /api/v1/market/session", async () => {
    const sessionRes = await app.inject({
      method: "GET",
      url: "/api/v1/market/session",
    });

    expect(sessionRes.statusCode).toBe(200);
    const session = JSON.parse(sessionRes.body);
    expect(session.session).toBeDefined();
    expect(session.message).toBeDefined();
  });
});
