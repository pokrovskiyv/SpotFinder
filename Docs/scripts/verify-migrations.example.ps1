# Verify Supabase migrations were applied successfully
#
# IMPORTANT: Copy this file to verify-migrations.ps1 and set environment variables:
# $env:SUPABASE_URL = "https://your-project.supabase.co"
# $env:SUPABASE_SERVICE_ROLE_KEY = "your_service_role_key"

$projectUrl = $env:SUPABASE_URL
$serviceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY

$headers = @{
    "apikey" = $serviceRoleKey
    "Authorization" = "Bearer $serviceRoleKey"
}

Write-Host ""
Write-Host "=== VERIFICATION OF SUPABASE MIGRATIONS ===" -ForegroundColor Cyan
Write-Host "Project: $projectUrl" -ForegroundColor Green
Write-Host ""

$expectedTables = @("users", "sessions", "user_preferences", "search_history", "places_cache")

Write-Host "Checking table existence..." -ForegroundColor Yellow
Write-Host ""

$foundTables = @()
$missingTables = @()

foreach ($table in $expectedTables) {
    try {
        $uri = "$projectUrl/rest/v1/$table" + "?limit=0"
        $null = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get -ErrorAction Stop
        Write-Host "[OK] Table '$table' exists" -ForegroundColor Green
        $foundTables += $table
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        if ($statusCode -eq 404) {
            Write-Host "[MISSING] Table '$table' NOT found" -ForegroundColor Red
            $missingTables += $table
        }
        elseif ($statusCode -eq 406) {
            Write-Host "[OK] Table '$table' exists (with warning)" -ForegroundColor Yellow
            $foundTables += $table
        }
        else {
            Write-Host "[?] Cannot verify table '$table'" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "=== RESULTS ===" -ForegroundColor Cyan
$color = if ($foundTables.Count -eq $expectedTables.Count) { "Green" } else { "Yellow" }
Write-Host "Found tables: $($foundTables.Count)/$($expectedTables.Count)" -ForegroundColor $color

if ($missingTables.Count -gt 0) {
    Write-Host ""
    Write-Host "WARNING: The following tables are missing:" -ForegroundColor Red
    foreach ($table in $missingTables) {
        Write-Host "  - $table" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Please apply migrations via Supabase Dashboard." -ForegroundColor Yellow
    Write-Host "See instructions: APPLY_MIGRATIONS_INSTRUCTIONS.md" -ForegroundColor Yellow
}
else {
    Write-Host ""
    Write-Host "SUCCESS! All tables have been created!" -ForegroundColor Green
    Write-Host "Database is ready to use." -ForegroundColor Green
}

Write-Host ""
