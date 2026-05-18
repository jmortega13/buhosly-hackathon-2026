-- Populate image_url on the four demo rewards seeded by V2.
-- Images are direct Unsplash CDN URLs (no API key needed). Swap them in
-- production by issuing your own UPDATE statements or replacing the rows.

UPDATE rewards SET image_url =
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop&q=80'
WHERE id = '11111111-1111-1111-1111-111111111111';   -- Coffee on the company

UPDATE rewards SET image_url =
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop&q=80'
WHERE id = '22222222-2222-2222-2222-222222222222';   -- Half-day off

UPDATE rewards SET image_url =
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop&q=80'
WHERE id = '33333333-3333-3333-3333-333333333333';   -- Lunch voucher

UPDATE rewards SET image_url =
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop&q=80'
WHERE id = '44444444-4444-4444-4444-444444444444';   -- Custom merch
