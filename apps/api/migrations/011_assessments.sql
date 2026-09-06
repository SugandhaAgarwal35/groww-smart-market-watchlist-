CREATE TABLE IF NOT EXISTS change_assessments (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    watchlist_id UUID NOT NULL REFERENCES watchlists(id),
    security_id UUID NOT NULL REFERENCES securities(id),

    baseline_observation_id UUID REFERENCES market_observations(id),
    current_observation_id UUID NOT NULL REFERENCES market_observations(id),
    snapshot_id UUID REFERENCES market_snapshots(id),

    attention_level TEXT NOT NULL,
    attention_score NUMERIC(10,4) NOT NULL,

    confidence_level TEXT NOT NULL,
    confidence_score NUMERIC(10,4) NOT NULL,

    rule_version TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_change_assessments_watchlist
ON change_assessments(watchlist_id, created_at DESC);
