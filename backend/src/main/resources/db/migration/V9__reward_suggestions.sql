-- Reward backlog: any user can suggest a reward, anyone can vote on it,
-- admins can promote a popular suggestion into a real reward or dismiss it.

CREATE TABLE reward_suggestions (
    id                    UUID         PRIMARY KEY,
    name                  VARCHAR(100) NOT NULL,
    description           TEXT         NOT NULL DEFAULT '',
    image_url             VARCHAR(2048),
    suggested_by_user_id  UUID         NOT NULL REFERENCES users(id),
    created_at            TIMESTAMPTZ  NOT NULL,
    status                VARCHAR(20)  NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'promoted', 'dismissed')),
    promoted_reward_id    UUID         REFERENCES rewards(id)
);

CREATE INDEX idx_suggestions_status_created
    ON reward_suggestions (status, created_at DESC);

CREATE TABLE reward_suggestion_votes (
    suggestion_id  UUID         NOT NULL REFERENCES reward_suggestions(id) ON DELETE CASCADE,
    user_id        UUID         NOT NULL REFERENCES users(id),
    voted_at       TIMESTAMPTZ  NOT NULL,
    PRIMARY KEY (suggestion_id, user_id)
);

CREATE INDEX idx_suggestion_votes_user ON reward_suggestion_votes (user_id);
