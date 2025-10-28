# Redeploy Supabase Function and Setup Webhook
# This script automates the full deployment process

param(
    [string]$FunctionName = "telegram-webhook",
    [switch]$SkipWebhook = $false
)

Write-Host "=== SpotFinder Deployment Script ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Deploy function
Write-Host "📦 Deploying function: $FunctionName..." -ForegroundColor Yellow
Write-Host ""

try {
    npx supabase@latest functions deploy $FunctionName
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Deployment failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "✅ Function deployed successfully!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Deployment error: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Setup webhook (unless skipped)
if (-not $SkipWebhook) {
    Write-Host "⏳ Waiting 3 seconds for function to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    Write-Host ""
    
    Write-Host "🔧 Setting up webhook..." -ForegroundColor Yellow
    Write-Host ""
    
    # Check if bot token is set
    if (-not $env:TELEGRAM_BOT_TOKEN) {
        Write-Host "⚠️  Warning: TELEGRAM_BOT_TOKEN not set" -ForegroundColor Yellow
        Write-Host "Skipping webhook setup. Run manually:" -ForegroundColor Yellow
        Write-Host "  `$env:TELEGRAM_BOT_TOKEN = 'YOUR_TOKEN'" -ForegroundColor Cyan
        Write-Host "  .\Docs\scripts\setup-webhook-auto.ps1" -ForegroundColor Cyan
    } else {
        # Run webhook setup script
        & "$PSScriptRoot\setup-webhook-auto.ps1" -BotToken $env:TELEGRAM_BOT_TOKEN
    }
} else {
    Write-Host "⏭️  Skipping webhook setup (--SkipWebhook flag)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Test the bot with: 'промочил ноги'" -ForegroundColor White
Write-Host "2. Check logs at: https://supabase.com/dashboard/project/icnnwmjrprufrohiyfpm/logs/edge-logs" -ForegroundColor White
Write-Host ""
