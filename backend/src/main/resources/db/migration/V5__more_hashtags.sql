-- Broaden the starter set of hashtag suggestions so the # dropdown is useful
-- on a fresh database. V3 seeded the original 4 (teamwork, ownership, impact,
-- kindness); these are the broader Bonusly-style defaults teams commonly use.
-- ON CONFLICT DO NOTHING keeps this migration idempotent if a tag already
-- exists (e.g., because someone used it before this migration was added).

INSERT INTO hashtags (tag, usage_count, last_used_at) VALUES
    ('collaboration', 0, NOW()),
    ('mentorship',    0, NOW()),
    ('innovation',    0, NOW()),
    ('leadership',    0, NOW()),
    ('helpful',       0, NOW()),
    ('growth',        0, NOW()),
    ('customer-love', 0, NOW()),
    ('above-and-beyond', 0, NOW()),
    ('problem-solving',  0, NOW()),
    ('craftsmanship', 0, NOW())
ON CONFLICT (tag) DO NOTHING;
