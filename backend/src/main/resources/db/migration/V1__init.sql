CREATE TABLE users (
    id              UUID PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    giving_balance  INTEGER      NOT NULL DEFAULT 0,
    giving_month    VARCHAR(7)   NOT NULL,
    earned_balance  INTEGER      NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL,
    row_version     INTEGER      NOT NULL DEFAULT 0
);

CREATE TABLE rewards (
    id           UUID PRIMARY KEY,
    name         VARCHAR(255) NOT NULL,
    description  TEXT         NOT NULL DEFAULT '',
    cost_points  INTEGER      NOT NULL CHECK (cost_points > 0),
    image_url    VARCHAR(2048),
    active       BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE recognitions (
    id            UUID PRIMARY KEY,
    giver_id      UUID         NOT NULL REFERENCES users(id),
    recipient_id  UUID         NOT NULL REFERENCES users(id),
    amount        INTEGER      NOT NULL CHECK (amount > 0),
    message       TEXT         NOT NULL,
    hashtags      VARCHAR(512) NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ  NOT NULL
);

CREATE INDEX idx_recognitions_created_at ON recognitions(created_at DESC);
CREATE INDEX idx_recognitions_giver      ON recognitions(giver_id);
CREATE INDEX idx_recognitions_recipient  ON recognitions(recipient_id);

CREATE TABLE redemptions (
    id            UUID PRIMARY KEY,
    user_id       UUID         NOT NULL REFERENCES users(id),
    reward_id     UUID         NOT NULL REFERENCES rewards(id),
    cost_points   INTEGER      NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'pending'
);

CREATE INDEX idx_redemptions_user ON redemptions(user_id);
