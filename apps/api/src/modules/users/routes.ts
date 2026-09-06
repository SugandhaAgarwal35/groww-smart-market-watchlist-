import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../auth/routes.js";
import { usersService } from "./service.js";

const updatePreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  defaultWatchlistId: z.string().uuid().nullable().optional(),
  displayDensity: z.enum(["comfortable", "compact"]).optional(),
});

export async function userRoutes(app: FastifyInstance) {
  // ── GET /api/v1/users/me ──────────────────────────────────
  app.get("/me", async (request, reply) => {
    const userId = await authenticate(request);
    const user = await usersService.getUserProfile(userId);
    if (!user) {
      return reply.status(404).send({
        error: { code: "USER_NOT_FOUND", message: "User not found" },
      });
    }
    return user;
  });

  // ── GET /api/v1/users/preferences ────────────────────────
  app.get("/preferences", async (request) => {
    const userId = await authenticate(request);
    return usersService.getPreferences(userId);
  });

  // ── PUT /api/v1/users/preferences ────────────────────────
  app.put("/preferences", async (request) => {
    const userId = await authenticate(request);
    const body = updatePreferencesSchema.parse(request.body);
    return usersService.updatePreferences(userId, body);
  });
}
