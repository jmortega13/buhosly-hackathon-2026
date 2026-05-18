-- Optional GIF attachment per recognition. Multi-recipient gives copy the same
-- URL onto every row.
ALTER TABLE recognitions
    ADD COLUMN gif_url VARCHAR(2048);
