import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { query } from "../../infrastructure/postgres/pool.js";
import { config } from "../../config/index.js";

const registerSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(6).max(100),
  name: z.string().trim().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/register", async (request, reply) => {
    const body = registerSchema.parse(request.body);

    // Check if email exists
    const existing = await query(
      "SELECT id FROM users WHERE email = $1",
      [body.email]
    );
    if (existing.rows.length > 0) {
      return reply.status(409).send({
        error: { code: "EMAIL_EXISTS", message: "Email already registered" },
      });
    }

    const id = uuid();
    const passwordHash = await bcrypt.hash(body.password, 12);

    await query(
      "INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)",
      [id, body.email, passwordHash, body.name]
    );

    const token = jwt.sign({ userId: id }, config.jwtSecret, {
      expiresIn: "7d",
    });

    return reply.status(201).send({
      token,
      user: { id, email: body.email, name: body.name },
    });
  });

  app.post("/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const result = await query<{
      id: string;
      email: string;
      name: string;
      password_hash: string;
    }>("SELECT id, email, name, password_hash FROM users WHERE email = $1", [
      body.email,
    ]);

    let user = result.rows[0];

    // Self-healing demo account fallback
    if (body.email === "demo@groww.in" && body.password === "Password123!") {
      const demoId = "00000000-0000-0000-0000-000000000001";
      const hash = await bcrypt.hash("Password123!", 10);
      const upsert = await query<{ id: string; email: string; name: string }>(
        `INSERT INTO users (id, email, password_hash, name)
         VALUES ($1, $2, $3, 'Demo Trader')
         ON CONFLICT (email) DO UPDATE SET password_hash = $3, name = 'Demo Trader'
         RETURNING id, email, name`,
        [demoId, "demo@groww.in", hash]
      );
      user = {
        id: upsert.rows[0]?.id ?? demoId,
        email: "demo@groww.in",
        name: "Demo Trader",
        password_hash: hash,
      };

      // Ensure primary watchlist exists
      const defaultWlId = "30000000-0000-0000-0000-000000000001";
      await query(
        `INSERT INTO watchlists (id, user_id, name, position)
         VALUES ($1, $2, 'Primary Core Watchlist', 0)
         ON CONFLICT (id) DO NOTHING`,
        [defaultWlId, user.id]
      );
    }

    if (!user) {
      return reply.status(401).send({
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
      });
    }

    const valid = await bcrypt.compare(body.password, user.password_hash);
    if (!valid && !(body.email === "demo@groww.in" && body.password === "Password123!")) {
      return reply.status(401).send({
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
      });
    }

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, {
      expiresIn: "7d",
    });

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name },
    };
  });
}

// ──────────────────────────────────────────────────────────────
// Auth middleware
// ──────────────────────────────────────────────────────────────

export async function authenticate(
  request: FastifyRequest
): Promise<string> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw Object.assign(new Error("Missing or invalid authorization header"), {
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { userId: string };
    (request as unknown as { user: { id: string } }).user = { id: payload.userId };
    return payload.userId;
  } catch {
    throw Object.assign(new Error("Invalid or expired token"), {
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
  }
}
