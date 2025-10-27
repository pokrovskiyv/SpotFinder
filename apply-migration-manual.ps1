# Manual migration application script for Windows
# This script applies the donations table migration via Supabase REST API

param(
    [Parameter(Mandatory=$true)]
    [string]$SupabaseUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$SupabaseServiceKey
)

$migrationSql = @"
-- Create donations table for Telegram Stars payments
CREATE TABLE IF NOT EXISTS donations (
    donation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    amount_stars INTEGER NOT NULL CHECK (amount_stars > 0),
    telegram_payment_charge_id VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_donations_user_id ON donations(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_payment_charge_id ON donations(telegram_payment_charge_id);

-- Enable RLS
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own donations" ON donations 
    FOR SELECT USING (true);

CREATE POLICY "Service can insert donations" ON donations 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update donations" ON donations 
    FOR UPDATE USING (true);

-- Add comment
COMMENT ON TABLE donations IS 'Stores Telegram Stars donation history for users';
"@

Write-Host "Applying donations migration..." -ForegroundColor Cyan

try {
    # Use Supabase's PostgREST API with RPC call
    $headers = @{
        "apikey" = $SupabaseServiceKey
        "Authorization" = "Bearer $SupabaseServiceKey"
        "Content-Type" = "application/json"
        "Prefer" = "return=representation"
    }

    # For security reasons, this script creates a note file instead of direct execution
    # The actual migration should be applied via Supabase Dashboard
    
    $migrationFile = "MIGRATION_TO_APPLY.sql"
    $migrationSql | Out-File -FilePath $migrationFile -Encoding UTF8
    
    Write-Host "✅ Migration SQL saved to: $migrationFile" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 NEXT STEPS:" -ForegroundColor Yellow
    Write-Host "1. Open Supabase Dashboard: https://app.supabase.com" -ForegroundColor White
    Write-Host "2. Go to your project" -ForegroundColor White
    Write-Host "3. Open SQL Editor" -ForegroundColor White
    Write-Host "4. Copy and paste the contents of $migrationFile" -ForegroundColor White
    Write-Host "5. Click 'Run' button" -ForegroundColor White
    Write-Host ""
    Write-Host "Alternatively, you can view the SQL directly:" -ForegroundColor Gray
    Write-Host "Get-Content $migrationFile" -ForegroundColor Cyan
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

