CREATE TABLE seen_states (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    security_id UUID NOT NULL REFERENCES securities(id),

    baseline_observation_id UUID REFERENCES market_observations(id),
    baseline_price NUMERIC(20,8),
    baseline_observed_at TIMESTAMPTZ,
    baseline_market_session_id UUID,

    baseline_version BIGINT NOT NULL DEFAULT 0,

    seen_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_seen_state
        UNIQUE (user_id, watchlist_id, security_id)
);

CREATE INDEX idx_seen_states_user_watchlist
ON seen_states(user_id, watchlist_id);
