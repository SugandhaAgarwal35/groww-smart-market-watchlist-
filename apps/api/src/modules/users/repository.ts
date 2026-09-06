import { query } from "../../infrastructure/postgres/pool.js";
import type { UserPreferences, ThemePreference, DisplayDensity } from "@watchlist/contracts";

interface UserPreferencesRow {
  user_id: string;
  theme: string;
  default_watchlist_id: string | null;
  display_density: string;
  updated_at: Date;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  created_at: Date;
}

export class UsersRepository {
  public async getUserById(id: string): Promise<{ id: string; email: string; name: string } | null> {
    const res = await query<UserRow>(
      `SELECT id, email, name, created_at FROM users WHERE id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0]!;
    return { id: r.id, email: r.email, name: r.name };
  }

  public async getPreferences(userId: string): Promise<UserPreferences> {
    const res = await query<UserPreferencesRow>(
      `SELECT user_id, theme, default_watchlist_id, display_density, updated_at
       FROM user_preferences
       WHERE user_id = $1`,
      [userId]
    );

    if (res.rows.length === 0) {
      // Create default preferences if not yet existing
      const insertRes = await query<UserPreferencesRow>(
        `INSERT INTO user_preferences (user_id, theme, default_watchlist_id, display_density, updated_at)
         VALUES ($1, 'system', NULL, 'comfortable', NOW())
         ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
         RETURNING user_id, theme, default_watchlist_id, display_density, updated_at`,
        [userId]
      );
      const r = insertRes.rows[0]!;
      return {
        userId: r.user_id,
        theme: r.theme as ThemePreference,
        defaultWatchlistId: r.default_watchlist_id,
        displayDensity: r.display_density as DisplayDensity,
        updatedAt: r.updated_at.toISOString(),
      };
    }

    const r = res.rows[0]!;
    return {
      userId: r.user_id,
      theme: r.theme as ThemePreference,
      defaultWatchlistId: r.default_watchlist_id,
      displayDensity: r.display_density as DisplayDensity,
      updatedAt: r.updated_at.toISOString(),
    };
  }

  public async updatePreferences(
    userId: string,
    updates: {
      theme?: ThemePreference;
      defaultWatchlistId?: string | null;
      displayDensity?: DisplayDensity;
    }
  ): Promise<UserPreferences> {
    const current = await this.getPreferences(userId);

    const theme = updates.theme ?? current.theme;
    const defaultWatchlistId =
      updates.defaultWatchlistId !== undefined
        ? updates.defaultWatchlistId
        : current.defaultWatchlistId;
    const displayDensity = updates.displayDensity ?? current.displayDensity;

    const res = await query<UserPreferencesRow>(
      `INSERT INTO user_preferences (user_id, theme, default_watchlist_id, display_density, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET theme = EXCLUDED.theme,
           default_watchlist_id = EXCLUDED.default_watchlist_id,
           display_density = EXCLUDED.display_density,
           updated_at = NOW()
       RETURNING user_id, theme, default_watchlist_id, display_density, updated_at`,
      [userId, theme, defaultWatchlistId, displayDensity]
    );

    const r = res.rows[0]!;
    return {
      userId: r.user_id,
      theme: r.theme as ThemePreference,
      defaultWatchlistId: r.default_watchlist_id,
      displayDensity: r.display_density as DisplayDensity,
      updatedAt: r.updated_at.toISOString(),
    };
  }
}

export const usersRepository = new UsersRepository();
