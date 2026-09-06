CREATE TABLE assessment_evidence (
    id UUID PRIMARY KEY,
    assessment_id UUID NOT NULL REFERENCES change_assessments(id) ON DELETE CASCADE,
    evidence_type TEXT NOT NULL,
    numeric_value NUMERIC(20,8),
    text_value TEXT,
    source_observation_id UUID REFERENCES market_observations(id),
    contribution TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
