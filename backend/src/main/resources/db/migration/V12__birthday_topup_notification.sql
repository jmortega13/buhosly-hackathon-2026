-- Add `birthday_topup` to the notifications type whitelist.
-- The inline CHECK on V11 was given Postgres's default name
-- (`notifications_type_check`). Guard the drop in case a re-run hits an
-- environment where the constraint has been renamed.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'notifications_type_check'
    ) THEN
        ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
    END IF;
END $$;

ALTER TABLE notifications
    ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
        'recognition_received',
        'giveable_refreshed',
        'giveable_expiring',
        'birthday_topup'
    ));
