import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config/index.js";
import { healthRoutes } from "./modules/health/routes.js";
import { authRoutes } from "./modules/auth/routes.js";
import { watchlistRoutes } from "./modules/watchlists/routes.js";
import { securitiesRoutes } from "./modules/securities/routes.js";
import { snapshotRoutes } from "./modules/snapshot/routes.js";
import { seenStateRoutes } from "./modules/seen-state/routes.js";
import { marketRoutes } from "./modules/market-data/routes.js";
import { userRoutes } from "./modules/users/routes.js";
import { realtimeMarketService } from "./modules/market-data/realtime-market.service.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === "development" ? "info" : "warn",
    },
    requestIdHeader: "x-request-id",
    genReqId: () => crypto.randomUUID(),
  });

  // Security Headers
  await app.register(helmet, {
    contentSecurityPolicy: false, // API server serves JSON, frontend manages UI CSP
  });

  // Rate Limiting (200 requests per minute per IP)
  await app.register(rateLimit, {
    max: 200,
    timeWindow: "1 minute",
    errorResponseBuilder: (request, context) => ({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: `Too many requests. Limit is ${context.max} requests per ${context.after}. Please retry later.`,
      },
    }),
  });

  // CORS
  const configuredOrigins = config.webOrigin
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) {
        return cb(null, true);
      }
      if (configuredOrigins.includes(origin)) {
        return cb(null, true);
      }
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return cb(null, true);
      }
      if (/^https:\/\/([a-zA-Z0-9_-]+)\.onrender\.com$/.test(origin)) {
        return cb(null, true);
      }
      cb(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
  });

  // Request timing
  app.addHook("onResponse", (request, reply, done) => {
    const duration = reply.elapsedTime;
    if (duration > 500) {
      request.log.warn(
        { method: request.method, url: request.url, duration },
        "Slow request"
      );
    }
    done();
  });

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error, "Request error");

    const err = error as { statusCode?: number; code?: string; message?: string };
    const statusCode = err.statusCode ?? 500;
    const code = err.code ?? "INTERNAL_ERROR";

    reply.status(statusCode).send({
      error: {
        code,
        message:
          statusCode >= 500 ? "Internal server error" : (err.message ?? "An error occurred"),
        requestId: request.id,
      },
    });
  });

  // Register routes
  await app.register(healthRoutes, { prefix: "/api/v1" });
  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(watchlistRoutes, { prefix: "/api/v1/watchlists" });
  await app.register(securitiesRoutes, { prefix: "/api/v1/securities" });
  await app.register(snapshotRoutes, { prefix: "/api/v1/watchlists" });
  await app.register(seenStateRoutes, { prefix: "/api/v1/watchlists" });
  await app.register(marketRoutes, { prefix: "/api/v1/market" });
  await app.register(userRoutes, { prefix: "/api/v1/users" });

  // Initialize Real-time Market Simulation Engine
  realtimeMarketService.initialize().catch((err) => {
    app.log.error(err, "Failed to initialize realtime market service");
  });

  return app;
}
