CREATE TABLE IF NOT EXISTS market_observations (
    id UUID PRIMARY KEY,
    security_id UUID NOT NULL REFERENCES securities(id),
    provider TEXT NOT NULL,
    source_event_id TEXT,

    price NUMERIC(20,8) NOT NULL,
    volume NUMERIC(30,4),

    day_change NUMERIC(20,8),
    day_change_pct NUMERIC(20,8),

    open_price NUMERIC(20,8),
    high_price NUMERIC(20,8),
    low_price NUMERIC(20,8),
    previous_close NUMERIC(20,8),

    week_52_high NUMERIC(20,8),
    week_52_low NUMERIC(20,8),

    observed_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    quality_status TEXT NOT NULL DEFAULT 'TRUSTED',

    raw_payload JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_obs_security_observed
ON market_observations(security_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_market_obs_provider_event
ON market_observations(provider, source_event_id);
