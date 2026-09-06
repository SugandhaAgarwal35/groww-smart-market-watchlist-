import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";

describe("Securities Search & Watchlist Items Tests", () => {
  let app: FastifyInstance;
  let token: string;
  let watchlistId: string;
  let pcJewellerId: string;
  let infyId: string;

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

    // Create dedicated test watchlist
    const wlRes = await app.inject({
      method: "POST",
      url: "/api/v1/watchlists",
      headers: { Authorization: `Bearer ${token}` },
      payload: { name: "Search & Delete Test Watchlist" },
    });

    const wlBody = JSON.parse(wlRes.body);
    watchlistId = wlBody.id;
  });

  afterAll(async () => {
    if (watchlistId) {
      await app.inject({
        method: "DELETE",
        url: `/api/v1/watchlists/${watchlistId}`,
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    await app.close();
  });

  // ── 1. Search Tests ─────────────────────────────────────────

  it("should find security by exact symbol (PCJEWELLER and INFY)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/securities/search?q=PCJEWELLER",
    });

    expect(res.statusCode).toBe(200);
    const results = JSON.parse(res.body);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].symbol).toBe("PCJEWELLER");
    expect(results[0].name).toContain("PC Jeweller");
    expect(results[0].exchange).toBe("NSE");
    expect(results[0].sectorName).toBeDefined();

    pcJewellerId = results[0].id;

    const infyRes = await app.inject({
      method: "GET",
      url: "/api/v1/securities/search?q=INFY",
    });
    expect(infyRes.statusCode).toBe(200);
    const infyResults = JSON.parse(infyRes.body);
    expect(infyResults[0].symbol).toBe("INFY");
    infyId = infyResults[0].id;
  });

  it("should find security by partial symbol (PCJ, INF)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/securities/search?q=PCJ",
    });

    expect(res.statusCode).toBe(200);
    const results = JSON.parse(res.body);
    expect(results.some((r: { symbol: string }) => r.symbol === "PCJEWELLER")).toBe(true);
  });

  it("should find security by company name with spaces (PC Jeweller, Infosys)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/securities/search?q=PC%20Jeweller",
    });

    expect(res.statusCode).toBe(200);
    const results = JSON.parse(res.body);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].symbol).toBe("PCJEWELLER");
    expect(results[0].name).toBe("PC Jeweller Limited");
  });

  it("should support case-insensitive search (pc jeweller, pcjeweller, hdfcbank)", async () => {
    const res1 = await app.inject({
      method: "GET",
      url: "/api/v1/securities/search?q=pc%20jeweller",
    });
    expect(res1.statusCode).toBe(200);
    expect(JSON.parse(res1.body)[0].symbol).toBe("PCJEWELLER");

    const res2 = await app.inject({
      method: "GET",
      url: "/api/v1/securities/search?q=pcjeweller",
    });
    expect(res2.statusCode).toBe(200);
    expect(JSON.parse(res2.body)[0].symbol).toBe("PCJEWELLER");

    const res3 = await app.inject({
      method: "GET",
      url: "/api/v1/securities/search?q=hdfcbank",
    });
    expect(res3.statusCode).toBe(200);
    expect(JSON.parse(res3.body)[0].symbol).toBe("HDFCBANK");
  });

  it("should support multi-word company names (HDFC Bank, Tata Motors)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/securities/search?q=HDFC%20Bank",
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)[0].symbol).toBe("HDFCBANK");

    const tmRes = await app.inject({
      method: "GET",
      url: "/api/v1/securities/search?q=Tata%20Motors",
    });
    expect(tmRes.statusCode).toBe(200);
    expect(JSON.parse(tmRes.body)[0].symbol).toBe("TATAMOTORS");
  });

  it("should return empty array for non-existent queries without error", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/securities/search?q=NONEXISTENT_XYZ_9999",
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual([]);

    const emptyRes = await app.inject({
      method: "GET",
      url: "/api/v1/securities/search?q=",
    });
    expect(emptyRes.statusCode).toBe(200);
    expect(JSON.parse(emptyRes.body)).toEqual([]);
  });

  // ── 2. Watchlist Items & Delete Tests ───────────────────────

  it("should add security to watchlist and enforce duplicate protection", async () => {
    // 1st addition: succeeds (201)
    const add1 = await app.inject({
      method: "POST",
      url: `/api/v1/watchlists/${watchlistId}/items`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { securityId: pcJewellerId },
    });
    expect(add1.statusCode).toBe(201);

    // 2nd addition: duplicate protected (returns already_exists, 200)
    const add2 = await app.inject({
      method: "POST",
      url: `/api/v1/watchlists/${watchlistId}/items`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { securityId: pcJewellerId },
    });
    expect(add2.statusCode).toBe(200);
    expect(JSON.parse(add2.body).status).toBe("already_exists");

    // Add another stock (INFY)
    const addInfy = await app.inject({
      method: "POST",
      url: `/api/v1/watchlists/${watchlistId}/items`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { securityId: infyId },
    });
    expect(addInfy.statusCode).toBe(201);
  });

  it("should accept bodyless DELETE request and remove only the requested security", async () => {
    // Verify 2 items in watchlist before deletion
    const beforeGet = await app.inject({
      method: "GET",
      url: `/api/v1/watchlists/${watchlistId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    const beforeItems = JSON.parse(beforeGet.body).items;
    expect(beforeItems.length).toBe(2);

    // Send bodyless DELETE (without Content-Type: application/json)
    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/api/v1/watchlists/${watchlistId}/items/${pcJewellerId}`,
      headers: {
        Authorization: `Bearer ${token}`,
        // Note: No Content-Type header on bodyless request
      },
    });

    expect(deleteRes.statusCode).toBe(204);
    expect(deleteRes.body).toBe("");

    // Verify only PC Jeweller was removed; INFY remains
    const afterGet = await app.inject({
      method: "GET",
      url: `/api/v1/watchlists/${watchlistId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    const afterItems = JSON.parse(afterGet.body).items;
    expect(afterItems.length).toBe(1);
    expect(afterItems[0].symbol).toBe("INFY");
  });

  it("should reject unauthorized deletion attempts", async () => {
    const unauthDelete = await app.inject({
      method: "DELETE",
      url: `/api/v1/watchlists/${watchlistId}/items/${infyId}`,
      // Missing Authorization header
    });
    expect(unauthDelete.statusCode).toBe(401);
  });
});
