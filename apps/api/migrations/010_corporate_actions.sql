CREATE TABLE corporate_actions (
    id UUID PRIMARY KEY,
    security_id UUID NOT NULL REFERENCES securities(id),
    action_type TEXT NOT NULL,
    effective_at TIMESTAMPTZ NOT NULL,
    adjustment_factor NUMERIC(20,8),
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_corporate_actions_security_time
ON corporate_actions(security_id, effective_at);
