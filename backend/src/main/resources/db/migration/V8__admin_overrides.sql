-- Persistent per-user monthly-allowance override. NULL = use
-- app.allowance.default-points (the global default, currently 30).
-- Non-null = use this value on every future monthly refresh. The current
-- month's `giving_balance` is NOT touched when the override changes; admins
-- use the separate top-up endpoint to bump someone's balance today.
ALTER TABLE users
    ADD COLUMN monthly_allowance INTEGER;
