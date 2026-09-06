CREATE TABLE IF NOT EXISTS securities (
    id UUID PRIMARY KEY,
    symbol TEXT NOT NULL,
    exchange TEXT NOT NULL,
    trading_symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    sector_id UUID REFERENCES sectors(id),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_security_exchange_symbol
        UNIQUE (exchange, trading_symbol)
);

CREATE INDEX IF NOT EXISTS idx_securities_symbol ON securities(symbol);
CREATE INDEX IF NOT EXISTS idx_securities_name ON securities(name);
