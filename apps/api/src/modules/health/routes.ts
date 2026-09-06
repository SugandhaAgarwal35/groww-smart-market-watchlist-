import type { FastifyInstance } from "fastify";
import { healthCheck } from "../../infrastructure/postgres/pool.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  app.get("/health/ready", async (_request, reply) => {
    const dbHealthy = await healthCheck();
    if (!dbHealthy) {
      return reply.status(503).send({
        status: "not_ready",
        database: "unreachable",
      });
    }
    return { status: "ready", database: "connected" };
  });
}
