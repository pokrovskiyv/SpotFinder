-- Create sessions table for managing user state
CREATE TABLE IF NOT EXISTS sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Geolocation context
    current_location_lat DECIMAL(10, 7) NULL,
    current_location_lon DECIMAL(10, 7) NULL,
    location_timestamp TIMESTAMP WITH TIME ZONE NULL,
    
    -- Dialog context
    last_query TEXT NULL,
    last_results JSONB NULL, -- Array of {place_id, name, ...}
    conversation_state VARCHAR(50) DEFAULT 'default', -- 'default', 'awaiting_location', 'awaiting_followup'
    
    -- Session management
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at);

-- Enable RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Service role can manage sessions" ON sessions 
    FOR ALL USING (true);

