-- Create API cost tracking tables for monitoring and limiting API usage

-- Table 1: API cost metrics (logging all API calls)
CREATE TABLE IF NOT EXISTS api_cost_metrics (
    metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
    api_provider TEXT NOT NULL CHECK (api_provider IN ('gemini', 'google_maps')),
    api_type TEXT NOT NULL, -- 'search', 'details', 'geocode', 'translate', 'nearby', 'textsearch'
    tokens_estimated INTEGER DEFAULT 0,
    cost_usd DECIMAL(10, 6) DEFAULT 0,
    from_cache BOOLEAN DEFAULT false,
    quota_exceeded BOOLEAN DEFAULT false,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date DATE DEFAULT CURRENT_DATE
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_api_cost_user_date ON api_cost_metrics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_api_cost_date ON api_cost_metrics(date);
CREATE INDEX IF NOT EXISTS idx_api_cost_provider ON api_cost_metrics(api_provider, date);
CREATE INDEX IF NOT EXISTS idx_api_cost_provider_type ON api_cost_metrics(api_provider, api_type, date);

-- Enable RLS
ALTER TABLE api_cost_metrics ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Service role can manage cost metrics" ON api_cost_metrics 
    FOR ALL USING (true);


-- Table 2: Search results cache (short-term cache for search queries)
CREATE TABLE IF NOT EXISTS search_results_cache (
    cache_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash TEXT NOT NULL,
    location_hash TEXT NOT NULL,
    results JSONB NOT NULL,
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '4 hours'),
    UNIQUE(query_hash, location_hash)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_search_cache_hashes ON search_results_cache(query_hash, location_hash);
CREATE INDEX IF NOT EXISTS idx_search_cache_expires ON search_results_cache(expires_at);

-- Enable RLS
ALTER TABLE search_results_cache ENABLE ROW LEVEL SECURITY;

-- Policies (cache is read-only for everyone)
CREATE POLICY "Anyone can read search cache" ON search_results_cache 
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage search cache" ON search_results_cache 
    FOR ALL USING (true);


-- Table 3: Geocoding cache (long-term cache for city coordinates)
CREATE TABLE IF NOT EXISTS geocoding_cache (
    city_name TEXT PRIMARY KEY,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    -- No expires_at - cities don't change coordinates
);

-- Enable RLS
ALTER TABLE geocoding_cache ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read geocoding cache" ON geocoding_cache 
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage geocoding cache" ON geocoding_cache 
    FOR ALL USING (true);


-- Add comments
COMMENT ON TABLE api_cost_metrics IS 'Tracks all API calls with cost estimates for quota management';
COMMENT ON TABLE search_results_cache IS 'Short-term cache for search results (4 hours TTL)';
COMMENT ON TABLE geocoding_cache IS 'Long-term cache for city geocoding (cities coordinates are stable)';

