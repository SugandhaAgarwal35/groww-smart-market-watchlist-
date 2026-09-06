import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool, query } from "./pool.js";

function getMigrationsDir(): string {
  const candidates = [
    path.resolve(__dirname, "../../../migrations"),
    path.resolve(__dirname, "../../migrations"),
    path.resolve(process.cwd(), "migrations"),
    path.resolve(process.cwd(), "apps/api/migrations"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir) && fs.readdirSync(dir).some((f) => f.endsWith(".sql"))) {
      return dir;
    }
  }
  return candidates[0]!;
}

export async function runMigrations(): Promise<void> {
  const migrationsDir = getMigrationsDir();
  console.log(`Running database migrations from ${migrationsDir}...\n`);

  // Ensure migrations tracking table exists
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Get already applied migrations
  const applied = await query<{ name: string }>(
    "SELECT name FROM migrations ORDER BY name"
  );
  const appliedNames = new Set(applied.rows.map((r) => r.name));

  // Read migration files
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let count = 0;
  for (const file of files) {
    if (appliedNames.has(file)) {
      console.log(`  ✓ ${file} (already applied)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
        [file]
      );
      await client.query("COMMIT");
      console.log(`  ✔ ${file} (applied)`);
      count++;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`  ✖ ${file} FAILED:`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log(`\n${count} migration(s) applied.`);
}

// Standalone execution support
if (process.argv[1] && process.argv[1].endsWith("migrate.ts")) {
  runMigrations()
    .then(async () => {
      await pool.end();
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}

