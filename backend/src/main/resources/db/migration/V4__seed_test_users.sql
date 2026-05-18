-- Demo users so the @-mention dropdown isn't empty on a fresh database.
--
-- These accounts CANNOT sign in (their emails are at @buhosly.demo, which is
-- not in `app.auth.allowed-domains`). They exist purely as recipients you can
-- send recognition to during a demo. Delete this migration (and the rows it
-- inserted) before deploying to production.
--
-- giving_month is computed at apply-time so the seeded users start the demo
-- with a current-month allowance. created_at uses NOW() (UTC).

DO
$$
DECLARE
    cur_month VARCHAR(7)  := TO_CHAR(NOW() AT TIME ZONE 'Asia/Manila', 'YYYY-MM');
    cur_ts    TIMESTAMPTZ := NOW();
BEGIN
    INSERT INTO users (id, email, name, giving_balance, giving_month, earned_balance, created_at) VALUES
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'maria.cruz@buhosly.demo',  'Maria Cruz',  30, cur_month,  0,  cur_ts),
        ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'juan.reyes@buhosly.demo',  'Juan Reyes',  30, cur_month, 25,  cur_ts),
        ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'anna.garcia@buhosly.demo', 'Anna Garcia', 30, cur_month, 100, cur_ts),
        ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'carlo.santos@buhosly.demo','Carlo Santos',25, cur_month, 50,  cur_ts),
        ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'bea.mendoza@buhosly.demo', 'Bea Mendoza', 30, cur_month, 10,  cur_ts);
END
$$;
