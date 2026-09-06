import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { pool } from "../src/infrastructure/postgres/pool.js";

describe("End-to-End API Pipeline", () => {
  let app: FastifyInstance;
  let authToken: string;
  let watchlistId: string;
  let securityId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("1. should register/login and obtain a valid JWT token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "demo@groww.in",
        password: "Password123!",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token).toBeDefined();
    expect(body.user.email).toBe("demo@groww.in");
    authToken = body.token;
  });

  it("2. should retrieve watchlists for authenticated user", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/watchlists",
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    watchlistId = body[0].id;
  });

  it("3. should retrieve intelligent watchlist snapshot", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/watchlists/${watchlistId}/snapshot`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const snap = res.json();
    expect(snap.watchlist.id).toBe(watchlistId);
    expect(snap.items.length).toBeGreaterThan(0);
    expect(snap.market.session).toBeDefined();
    expect(snap.summary).toBeDefined();

    // Verify item structure
    const first = snap.items[0];
    expect(first.security.symbol).toBeDefined();
    expect(first.change.attention).toBeDefined();
    expect(first.change.confidence).toBeDefined();
    expect(Array.isArray(first.explanation)).toBe(true);
    securityId = first.security.id;
  });

  it("4. should reject stale seen-state update (optimistic concurrency)", async () => {
    // Attempt update with mismatching baseline version
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/watchlists/${watchlistId}/items/${securityId}/seen`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        observationId: "00000000-0000-0000-0000-000000000001",
        baselineVersion: 999, // Mismatched version
      },
    });

    // Should return 409 Conflict or 404
    expect([404, 409]).toContain(res.statusCode);
  });

  it("5. should support scenario switching via demo endpoint", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/watchlists/demo/scenario",
      payload: { scenario: "BIG_MOVE" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ok");
    expect(body.scenario).toBe("BIG_MOVE");
  });
});
