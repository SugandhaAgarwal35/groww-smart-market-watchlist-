CREATE TABLE IF NOT EXISTS watchlist_items (
    id UUID PRIMARY KEY,
    watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    security_id UUID NOT NULL REFERENCES securities(id),
    position INTEGER NOT NULL,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_watchlist_security
        UNIQUE (watchlist_id, security_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_items_watchlist
ON watchlist_items(watchlist_id, position);
