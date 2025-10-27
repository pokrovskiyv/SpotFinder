-- Create user_preferences table for personalization
CREATE TABLE IF NOT EXISTS user_preferences (
    preference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Saved locations
    home_address TEXT NULL,
    home_location GEOMETRY(Point, 4326) NULL,
    work_address TEXT NULL,
    work_location GEOMETRY(Point, 4326) NULL,
    
    -- Search preferences
    preferred_transport_mode VARCHAR(20) DEFAULT 'walking', -- 'walking', 'driving', 'public'
    dietary_restrictions TEXT[] NULL, -- Array: ['vegan', 'gluten_free']
    
    -- Smart field: free text for Gemini context
    profile_notes TEXT NULL, -- "User prefers quiet places", "likes Asian cuisine"
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spatial indexes for geolocation queries
CREATE INDEX IF NOT EXISTS idx_user_prefs_home_location ON user_preferences USING GIST(home_location);
CREATE INDEX IF NOT EXISTS idx_user_prefs_work_location ON user_preferences USING GIST(work_location);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Service role can manage preferences" ON user_preferences 
    FOR ALL USING (true);

