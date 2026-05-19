-- Per-user notification stream. Append-only; rows never deleted.
CREATE TABLE notifications (
    id          UUID         PRIMARY KEY,
    user_id     UUID         NOT NULL REFERENCES users(id),
    type        VARCHAR(40)  NOT NULL
                CHECK (type IN ('recognition_received', 'giveable_refreshed', 'giveable_expiring')),
    title       VARCHAR(255) NOT NULL,
    body        TEXT         NOT NULL DEFAULT '',
    payload     JSONB,
    created_at  TIMESTAMPTZ  NOT NULL,
    read_at     TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user_created
    ON notifications (user_id, created_at DESC);

-- Partial index keeps the unread-count query cheap even as the table grows.
CREATE INDEX idx_notifications_user_unread
    ON notifications (user_id)
    WHERE read_at IS NULL;
