CREATE TABLE market_snapshots (
    id UUID PRIMARY KEY,
    version BIGINT NOT NULL UNIQUE,
    market_session_id UUID,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE market_snapshot_observations (
    snapshot_id UUID NOT NULL REFERENCES market_snapshots(id) ON DELETE CASCADE,
    observation_id UUID NOT NULL REFERENCES market_observations(id),
    PRIMARY KEY (snapshot_id, observation_id)
);
