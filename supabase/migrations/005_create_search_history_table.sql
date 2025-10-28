-- Create search_history table for analytics
CREATE TABLE IF NOT EXISTS search_history (
    search_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(user_id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Input data
    query_text TEXT NOT NULL,
    location_lat DECIMAL(10, 7) NOT NULL,
    location_lon DECIMAL(10, 7) NOT NULL,
    
    -- Output data
    gemini_response_text TEXT NULL,
    returned_place_ids TEXT[] NULL,
    results_count INT DEFAULT 0,
    top_result JSONB NULL,
    
    -- User feedback (critical for improvement!)
    selected_place_id TEXT NULL,
    user_rating INT NULL CHECK (user_rating >= 1 AND user_rating <= 5)
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_timestamp ON search_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_location ON search_history(location_lat, location_lon);

-- Enable RLS
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Service role can manage history" ON search_history 
    FOR ALL USING (true);

