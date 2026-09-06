import { buildApp } from "./app.js";
import { config } from "./config/index.js";
import { pool } from "./infrastructure/postgres/pool.js";
import { runMigrations } from "./infrastructure/postgres/migrate.js";
import { seedDatabase } from "./infrastructure/postgres/seed.js";

async function start() {
  try {
    console.log("Initializing database schema and seed data...");
    await runMigrations();
    await seedDatabase();
    console.log("✓ Database initialized successfully.");
  } catch (dbInitErr) {
    console.error("Database initialization notice:", dbInitErr);
  }

  const app = await buildApp();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    try {
      await app.close();
      console.log("✓ Fastify server closed.");
      await pool.end();
      console.log("✓ PostgreSQL connection pool drained.");
      process.exit(0);
    } catch (err) {
      console.error("Error during shutdown:", err);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
    console.log(`
╔══════════════════════════════════════════════╗
║   Smart Market Watchlist API                 ║
║   Port: ${String(config.port).padEnd(37)}║
║   Env:  ${config.nodeEnv.padEnd(37)}║
║   Provider: ${config.marketDataProvider.padEnd(33)}║
╚══════════════════════════════════════════════╝
    `);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
