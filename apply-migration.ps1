# Apply donation migration via Supabase REST API

$SUPABASE_URL = "https://icnnwmjrprufrohiyfpm.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imljbm53bWpycHJ1ZnJvaGl5ZnBtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU3ODI4NSwiZXhwIjoyMDc3MTU0Mjg1fQ.IfQ3P_k0yGQhN38dyu4IrY3WGuN-77nIecBECT-jIFc"

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
    Write-Host "1. Open: https://app.supabase.com/project/icnnwmjrprufrohiyfpm/sql/new" -ForegroundColor White
    Write-Host "2. Copy SQL from: supabase/migrations/007_create_donations_table.sql" -ForegroundColor White
    Write-Host "3. Paste and Run" -ForegroundColor White
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

