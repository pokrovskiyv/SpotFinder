-- Add fields for place caching and history to sessions table
-- History lives only as long as location is valid (~30 minutes)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS places_cache JSONB NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cache_query TEXT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cache_index INT DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS shown_place_ids TEXT[] NULL;


