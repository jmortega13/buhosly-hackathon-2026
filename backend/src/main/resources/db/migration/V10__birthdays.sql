-- Optional self-entered birthday (MM-DD only, no year stored) for the
-- "happy birthday" banner, the composer pre-fill shortcut, and a one-time-
-- per-year giving-balance top-up.
ALTER TABLE users
    ADD COLUMN birthday VARCHAR(5)
        CHECK (birthday IS NULL OR birthday ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'),
    ADD COLUMN last_birthday_topup_year INTEGER;
