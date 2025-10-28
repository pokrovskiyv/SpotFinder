-- Create user_shown_places table for tracking shown places history
CREATE TABLE IF NOT EXISTS user_shown_places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    place_id TEXT NOT NULL,
    place_name TEXT NOT NULL,
    shown_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    search_query TEXT,
    
    -- Unique constraint to prevent duplicate entries
    UNIQUE(user_id, place_id)
);

-- Create indexes for fast lookups
CREATE INDEX idx_shown_places_user_timestamp ON user_shown_places(user_id, shown_at DESC);
CREATE INDEX idx_shown_places_cleanup ON user_shown_places(shown_at);

-- Enable RLS
ALTER TABLE user_shown_places ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Service role can manage shown places" ON user_shown_places 
    FOR ALL USING (true);

-- Add places cache fields to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS places_cache JSONB NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cache_query TEXT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cache_index INT DEFAULT 0;


