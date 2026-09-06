import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { query } from "../../infrastructure/postgres/pool.js";
import { authenticate } from "../auth/routes.js";

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

const renameSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

const addItemSchema = z.object({
  securityId: z.string().uuid(),
});

const reorderSchema = z.object({
  securityIds: z.array(z.string().uuid()).min(1),
});

export async function watchlistRoutes(app: FastifyInstance) {
  // ── Create watchlist ──────────────────────────────────────
  app.post("/", async (request, reply) => {
    const userId = await authenticate(request);
    const body = createSchema.parse(request.body);

    const id = uuid();
    const countResult = await query<{ count: string }>(
      "SELECT COUNT(*)::int as count FROM watchlists WHERE user_id = $1",
      [userId]
    );
    const position = parseInt(countResult.rows[0]?.count ?? "0", 10);

    await query(
      `INSERT INTO watchlists (id, user_id, name, position) VALUES ($1, $2, $3, $4)`,
      [id, userId, body.name, position]
    );

    return reply.status(201).send({ id, name: body.name, position });
  });

  // ── List watchlists ───────────────────────────────────────
  app.get("/", async (request) => {
    const userId = await authenticate(request);

    const result = await query<{
      id: string;
      name: string;
      position: number;
      created_at: string;
      item_count: string;
    }>(
      `SELECT w.id, w.name, w.position, w.created_at,
              COUNT(wi.id)::int as item_count
       FROM watchlists w
       LEFT JOIN watchlist_items wi ON wi.watchlist_id = w.id
       WHERE w.user_id = $1
       GROUP BY w.id
       ORDER BY w.position`,
      [userId]
    );

    return result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      position: r.position,
      itemCount: parseInt(r.item_count, 10),
      createdAt: r.created_at,
    }));
  });

  // ── Get single watchlist ──────────────────────────────────
  app.get("/:id", async (request, reply) => {
    const userId = await authenticate(request);
    const { id } = request.params as { id: string };

    const result = await query<{
      id: string;
      name: string;
      position: number;
    }>(
      "SELECT id, name, position FROM watchlists WHERE id = $1 AND user_id = $2",
      [id, userId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        error: { code: "WATCHLIST_NOT_FOUND", message: "Watchlist not found" },
      });
    }

    // Load items
    const items = await query<{
      id: string;
      security_id: string;
      position: number;
      symbol: string;
      name: string;
      exchange: string;
    }>(
      `SELECT wi.id, wi.security_id, wi.position,
              s.symbol, s.name, s.exchange
       FROM watchlist_items wi
       JOIN securities s ON s.id = wi.security_id
       WHERE wi.watchlist_id = $1
       ORDER BY wi.position`,
      [id]
    );

    return {
      ...result.rows[0],
      items: items.rows.map((i) => ({
        id: i.id,
        securityId: i.security_id,
        position: i.position,
        symbol: i.symbol,
        name: i.name,
        exchange: i.exchange,
      })),
    };
  });

  // ── Rename watchlist ──────────────────────────────────────
  app.patch("/:id", async (request, reply) => {
    const userId = await authenticate(request);
    const { id } = request.params as { id: string };
    const body = renameSchema.parse(request.body);

    const result = await query(
      `UPDATE watchlists SET name = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3`,
      [body.name, id, userId]
    );

    if (result.rowCount === 0) {
      return reply.status(404).send({
        error: { code: "WATCHLIST_NOT_FOUND", message: "Watchlist not found" },
      });
    }

    return { id, name: body.name };
  });

  // ── Delete watchlist ──────────────────────────────────────
  app.delete("/:id", async (request, reply) => {
    const userId = await authenticate(request);
    const { id } = request.params as { id: string };

    const result = await query(
      "DELETE FROM watchlists WHERE id = $1 AND user_id = $2",
      [id, userId]
    );

    if (result.rowCount === 0) {
      return reply.status(404).send({
        error: { code: "WATCHLIST_NOT_FOUND", message: "Watchlist not found" },
      });
    }

    return reply.status(204).send();
  });

  // ── Add security to watchlist ─────────────────────────────
  app.post("/:id/items", async (request, reply) => {
    const userId = await authenticate(request);
    const { id: watchlistId } = request.params as { id: string };
    const body = addItemSchema.parse(request.body);

    // Verify ownership
    const wl = await query(
      "SELECT id FROM watchlists WHERE id = $1 AND user_id = $2",
      [watchlistId, userId]
    );
    if (wl.rows.length === 0) {
      return reply.status(404).send({
        error: { code: "WATCHLIST_NOT_FOUND", message: "Watchlist not found" },
      });
    }

    // Verify security exists
    const sec = await query("SELECT id FROM securities WHERE id = $1", [
      body.securityId,
    ]);
    if (sec.rows.length === 0) {
      return reply.status(404).send({
        error: { code: "SECURITY_NOT_FOUND", message: "Security not found" },
      });
    }

    // Get next position
    const posResult = await query<{ max_pos: string | null }>(
      "SELECT MAX(position) as max_pos FROM watchlist_items WHERE watchlist_id = $1",
      [watchlistId]
    );
    const nextPos = (parseInt(posResult.rows[0]?.max_pos ?? "-1", 10) || 0) + 1;

    const itemId = uuid();
    try {
      await query(
        `INSERT INTO watchlist_items (id, watchlist_id, security_id, position)
         VALUES ($1, $2, $3, $4)`,
        [itemId, watchlistId, body.securityId, nextPos]
      );
    } catch (err: unknown) {
      // Handle duplicate — idempotent
      if ((err as { code?: string }).code === "23505") {
        return reply.status(200).send({ status: "already_exists" });
      }
      throw err;
    }

    return reply.status(201).send({ id: itemId, position: nextPos });
  });

  // ── Remove security from watchlist ────────────────────────
  app.delete("/:id/items/:securityId", async (request, reply) => {
    const userId = await authenticate(request);
    const { id: watchlistId, securityId } = request.params as {
      id: string;
      securityId: string;
    };

    // Verify ownership
    const wl = await query(
      "SELECT id FROM watchlists WHERE id = $1 AND user_id = $2",
      [watchlistId, userId]
    );
    if (wl.rows.length === 0) {
      return reply.status(404).send({
        error: { code: "WATCHLIST_NOT_FOUND", message: "Watchlist not found" },
      });
    }

    await query(
      "DELETE FROM watchlist_items WHERE watchlist_id = $1 AND security_id = $2",
      [watchlistId, securityId]
    );

    return reply.status(204).send();
  });

  // ── Reorder items ─────────────────────────────────────────
  const reorderHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const userId = await authenticate(request);
    const { id: watchlistId } = request.params as { id: string };
    const body = reorderSchema.parse(request.body);

    // Verify ownership
    const wl = await query(
      "SELECT id FROM watchlists WHERE id = $1 AND user_id = $2",
      [watchlistId, userId]
    );
    if (wl.rows.length === 0) {
      return reply.status(404).send({
        error: { code: "WATCHLIST_NOT_FOUND", message: "Watchlist not found" },
      });
    }

    // Update positions
    for (let i = 0; i < body.securityIds.length; i++) {
      await query(
        `UPDATE watchlist_items SET position = $1
         WHERE watchlist_id = $2 AND security_id = $3`,
        [i, watchlistId, body.securityIds[i]]
      );
    }

    return { status: "ok" };
  };

  app.patch("/:id/items/reorder", reorderHandler);
  app.put("/:id/items/reorder", reorderHandler);
  app.patch("/:id/reorder", reorderHandler);
  app.put("/:id/reorder", reorderHandler);
}
