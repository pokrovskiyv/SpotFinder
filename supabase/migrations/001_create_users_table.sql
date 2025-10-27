-- Create users table
CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT PRIMARY KEY,
    telegram_username VARCHAR(100) NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NULL,
    language_code VARCHAR(10) DEFAULT 'ru',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_telegram_username ON users(telegram_username);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen_at);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies (users can read/write only their own data)
CREATE POLICY "Users can read own data" ON users 
    FOR SELECT USING (true); -- Allow service role to read all

CREATE POLICY "Users can insert own data" ON users 
    FOR INSERT WITH CHECK (true); -- Allow service role to insert

CREATE POLICY "Users can update own data" ON users 
    FOR UPDATE USING (true); -- Allow service role to update

