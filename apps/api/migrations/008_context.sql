CREATE TABLE IF NOT EXISTS benchmark_observations (
    id UUID PRIMARY KEY,
    benchmark_symbol TEXT NOT NULL,
    return_pct NUMERIC(20,8) NOT NULL,
    price NUMERIC(20,8),
    previous_close NUMERIC(20,8),
    observed_at TIMESTAMPTZ NOT NULL,
    snapshot_id UUID REFERENCES market_snapshots(id)
);

CREATE TABLE IF NOT EXISTS sector_observations (
    id UUID PRIMARY KEY,
    sector_id UUID NOT NULL REFERENCES sectors(id),
    return_pct NUMERIC(20,8) NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    snapshot_id UUID REFERENCES market_snapshots(id)
);
