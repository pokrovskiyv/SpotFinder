-- Create places_cache table for API call optimization
CREATE TABLE IF NOT EXISTS places_cache (
    place_id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    location GEOMETRY(Point, 4326),
    
    -- Cache raw JSON response to avoid parsing all fields
    google_data_jsonb JSONB,
    
    last_fetched_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- For cache invalidation
    cache_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_places_cache_location ON places_cache USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_places_cache_expires ON places_cache(cache_expires_at);
CREATE INDEX IF NOT EXISTS idx_places_cache_name ON places_cache(name);

-- Enable RLS
ALTER TABLE places_cache ENABLE ROW LEVEL SECURITY;

-- Policies (cache is read-only for everyone, write for service role)
CREATE POLICY "Anyone can read cache" ON places_cache 
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage cache" ON places_cache 
    FOR ALL USING (true);

