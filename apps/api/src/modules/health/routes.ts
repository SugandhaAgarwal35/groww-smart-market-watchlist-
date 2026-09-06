import type { FastifyInstance } from "fastify";
import { pool } from "../../infrastructure/postgres/pool.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  app.get("/health/ready", async (_request, reply) => {
    try {
      const res = await pool.query<{ count: string }>(
        "SELECT COUNT(*) as count FROM securities WHERE active = TRUE"
      );
      const count = parseInt(res.rows[0]?.count || "0", 10);
      if (count === 0) {
        return reply.status(503).send({
          status: "not_ready",
          database: "connected_but_empty",
          securitiesCount: 0,
          message: "Database schema or securities table is not yet seeded",
        });
      }
      return {
        status: "ready",
        database: "connected",
        securitiesCount: count,
      };
    } catch (err: unknown) {
      return reply.status(503).send({
        status: "not_ready",
        database: "unreachable_or_uninitialized",
        error: (err as Error).message || "Database check failed",
      });
    }
  });
}
