-- The Spynet search uses the trigram similarity of this extension to find
-- names with typos. The extension is trusted, thus the owner of the database
-- can create it without superuser rights.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
