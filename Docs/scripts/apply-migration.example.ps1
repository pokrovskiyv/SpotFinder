# Apply donation migration via Supabase REST API
# 
# IMPORTANT: Copy this file to apply-migration.ps1 and set environment variables:
# $env:SUPABASE_URL = "https://your-project.supabase.co"
# $env:SUPABASE_SERVICE_ROLE_KEY = "your_service_role_key"

$SUPABASE_URL = $env:SUPABASE_URL
$SUPABASE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

# Read SQL file
$sql = Get-Content "supabase/migrations/007_create_donations_table.sql" -Raw

Write-Host "Applying donation migration..." -ForegroundColor Cyan

try {
    # Use Supabase's REST API to execute SQL via query endpoint
    $body = @{
        query = $sql
    } | ConvertTo-Json

    $headers = @{
        "apikey" = $SUPABASE_KEY
        "Authorization" = "Bearer $SUPABASE_KEY"
        "Content-Type" = "application/json"
    }

    # Note: This approach won't work directly as Supabase doesn't have an execute endpoint
    # Alternative: Use psql or manual application
    Write-Host "❌ Cannot apply migration directly via REST API" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "✅ SOLUTION: Manually apply via Dashboard (2 minutes)" -ForegroundColor Green
    Write-Host ""
    Write-Host "1. Open: https://app.supabase.com/project/YOUR_PROJECT_ID/sql/new" -ForegroundColor White
    Write-Host "2. Copy SQL from: supabase/migrations/007_create_donations_table.sql" -ForegroundColor White
    Write-Host "3. Paste and Run" -ForegroundColor White
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
