import type { FastifyInstance } from "fastify";
import { authenticate } from "../auth/routes.js";
import { snapshotService } from "./service.js";
import { demoProvider } from "../../infrastructure/providers/demo/demo.provider.js";
import type { DemoScenarioName } from "../../infrastructure/providers/demo/scenarios.js";
import { DEMO_SCENARIOS } from "../../infrastructure/providers/demo/scenarios.js";
import { ingestMarketData } from "../../workers/market-ingestion.worker.js";

export async function snapshotRoutes(app: FastifyInstance) {
  // ── Intelligent Watchlist Snapshot ──────────
  app.get("/:id/snapshot", async (request, reply) => {
    const userId = await authenticate(request);
    const { id: watchlistId } = request.params as { id: string };

    const snapshot = await snapshotService.getWatchlistSnapshot(userId, watchlistId);

    if (!snapshot) {
      return reply.status(404).send({
        error: {
          code: "WATCHLIST_NOT_FOUND",
          message: "Watchlist not found or access denied",
        },
      });
    }

    return snapshot;
  });

  // ── Demo Scenario Controls ──────────────────
  app.get("/demo/scenarios", async () => {
    return {
      currentScenario: demoProvider.getScenario(),
      scenarios: DEMO_SCENARIOS,
    };
  });

  app.post("/demo/scenario", async (request, reply) => {
    const body = request.body as { scenario: DemoScenarioName };
    if (!body || !DEMO_SCENARIOS[body.scenario]) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid scenario name",
        },
      });
    }

    demoProvider.setScenario(body.scenario);
    try {
      const { realtimeMarketService } = await import("../market-data/realtime-market.service.js");
      realtimeMarketService.setScenario(body.scenario);
    } catch (e) {
      // ignore
    }

    // Immediately trigger market data ingestion to reflect new scenario quotes
    try {
      await ingestMarketData();
    } catch (err) {
      request.log.error(err, "Failed auto-ingestion on scenario switch");
    }

    return {
      status: "ok",
      scenario: body.scenario,
      definition: DEMO_SCENARIOS[body.scenario],
    };
  });
}
