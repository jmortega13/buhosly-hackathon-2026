CREATE TABLE hashtags (
    tag            VARCHAR(64) PRIMARY KEY
                   CHECK (tag ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
    usage_count    INTEGER     NOT NULL DEFAULT 0,
    last_used_at   TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_hashtags_popularity ON hashtags (usage_count DESC, last_used_at DESC);

-- Starter suggestions so a fresh DB has something in the # dropdown.
INSERT INTO hashtags (tag, usage_count, last_used_at) VALUES
    ('teamwork',  0, NOW()),
    ('ownership', 0, NOW()),
    ('impact',    0, NOW()),
    ('kindness',  0, NOW());
