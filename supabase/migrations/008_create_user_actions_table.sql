-- Create user_actions table for detailed action tracking
CREATE TABLE IF NOT EXISTS user_actions (
    action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'view_reviews', 'view_route', 'click_maps', 'select_place', 'donation'
    place_id TEXT NULL,
    search_id UUID NULL REFERENCES search_history(search_id) ON DELETE SET NULL,
    metadata JSONB NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_user_actions_user_id ON user_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_action_type ON user_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_user_actions_place_id ON user_actions(place_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_search_id ON user_actions(search_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_created_at ON user_actions(created_at DESC);

-- Enable RLS
ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Service role can manage actions" ON user_actions 
    FOR ALL USING (true);


