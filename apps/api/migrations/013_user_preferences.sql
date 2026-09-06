-- 013_user_preferences.sql
-- Persistent user display and operational preferences

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme TEXT NOT NULL DEFAULT 'system',
    default_watchlist_id UUID REFERENCES watchlists(id) ON DELETE SET NULL,
    display_density TEXT NOT NULL DEFAULT 'comfortable',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial preference for demo user
INSERT INTO user_preferences (user_id, theme, default_watchlist_id, display_density)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'light',
    '30000000-0000-0000-0000-000000000001',
    'comfortable'
)
ON CONFLICT (user_id) DO NOTHING;
