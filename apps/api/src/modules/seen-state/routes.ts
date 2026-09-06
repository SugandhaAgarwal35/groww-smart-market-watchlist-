import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../auth/routes.js";
import { query } from "../../infrastructure/postgres/pool.js";
import { seenStateService } from "./service.js";

const markSeenSchema = z.object({
  observationId: z.string().uuid(),
  observedAt: z.string().optional(),
  baselineVersion: z.number().int().min(0),
});

const markAllSeenSchema = z.object({
  items: z.array(
    z.object({
      securityId: z.string().uuid(),
      observationId: z.string().uuid(),
      baselineVersion: z.number().int().min(0),
    })
  ),
});

export async function seenStateRoutes(app: FastifyInstance) {
  // ── Mark single security as seen ─────────────
  app.post("/:id/items/:securityId/seen", { preHandler: [authenticate] }, async (request, reply) => {
    const user = (request as unknown as { user: { id: string } }).user;
    const { id: watchlistId, securityId } = request.params as {
      id: string;
      securityId: string;
    };

    const parse = markSeenSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: parse.error.issues[0]?.message ?? "Invalid input",
        },
      });
    }

    // Verify watchlist ownership
    const wl = await query(
      `SELECT id FROM watchlists WHERE id = $1 AND user_id = $2`,
      [watchlistId, user.id]
    );
    if (wl.rows.length === 0) {
      return reply.status(404).send({
        error: {
          code: "WATCHLIST_NOT_FOUND",
          message: "Watchlist not found or access denied",
        },
      });
    }

    const { observationId, baselineVersion } = parse.data;

    const result = await seenStateService.markSecuritySeen({
      userId: user.id,
      watchlistId,
      securityId,
      observationId,
      expectedVersion: baselineVersion,
    });

    if (!result.success) {
      return reply.status(409).send({
        error: {
          code: "STALE_SEEN_UPDATE",
          message: result.reason ?? "Conflicting or stale seen state transition",
        },
        currentVersion: result.newVersion,
      });
    }

    return {
      status: "ok",
      newVersion: result.newVersion,
    };
  });

  // ── Mark all securities as seen in a watchlist ─
  app.post("/:id/seen-all", { preHandler: [authenticate] }, async (request, reply) => {
    const user = (request as unknown as { user: { id: string } }).user;
    const { id: watchlistId } = request.params as { id: string };

    const parse = markAllSeenSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: parse.error.issues[0]?.message ?? "Invalid input",
        },
      });
    }

    // Verify watchlist ownership
    const wl = await query(
      `SELECT id FROM watchlists WHERE id = $1 AND user_id = $2`,
      [watchlistId, user.id]
    );
    if (wl.rows.length === 0) {
      return reply.status(404).send({
        error: {
          code: "WATCHLIST_NOT_FOUND",
          message: "Watchlist not found or access denied",
        },
      });
    }

    const result = await seenStateService.markAllSeenForWatchlist({
      userId: user.id,
      watchlistId,
      items: parse.data.items,
    });

    return {
      status: "ok",
      updatedCount: result.updatedCount,
      errors: result.errors,
    };
  });
}
