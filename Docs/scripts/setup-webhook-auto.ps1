# Automated Webhook Setup Script
# This script automatically sets the correct webhook URL after deployment

param(
    [string]$BotToken = $env:TELEGRAM_BOT_TOKEN,
    [string]$ProjectId = "icnnwmjrprufrohiyfpm"
)

Write-Host "=== SpotFinder Webhook Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if bot token is provided
if (-not $BotToken) {
    Write-Host "❌ Error: TELEGRAM_BOT_TOKEN not provided" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\setup-webhook-auto.ps1 -BotToken 'YOUR_TOKEN'" -ForegroundColor Yellow
    Write-Host "Or set environment variable:" -ForegroundColor Yellow
    Write-Host "  `$env:TELEGRAM_BOT_TOKEN = 'YOUR_TOKEN'" -ForegroundColor Yellow
    Write-Host "  .\setup-webhook-auto.ps1" -ForegroundColor Yellow
    exit 1
}

# Correct webhook URL format for Supabase
$webhookUrl = "https://$ProjectId.supabase.co/functions/v1/telegram-webhook"

Write-Host "📍 Project ID: $ProjectId" -ForegroundColor Green
Write-Host "🔗 Webhook URL: $webhookUrl" -ForegroundColor Green
Write-Host ""

# Delete old webhook first
Write-Host "🗑️  Deleting old webhook..." -ForegroundColor Yellow
try {
    $deleteResponse = Invoke-RestMethod -Uri "https://api.telegram.org/bot$BotToken/deleteWebhook"
    Write-Host "✅ Old webhook deleted" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not delete old webhook (may not exist)" -ForegroundColor Yellow
}

Write-Host ""

# Set new webhook
Write-Host "🔧 Setting new webhook..." -ForegroundColor Yellow
try {
    $setResponse = Invoke-RestMethod -Uri "https://api.telegram.org/bot$BotToken/setWebhook" `
        -Method Post `
        -ContentType "application/json" `
        -Body (ConvertTo-Json -Compress @{
            url = $webhookUrl
            allowed_updates = @("message", "callback_query", "pre_checkout_query")
        })
    
    if ($setResponse.ok) {
        Write-Host "✅ Webhook set successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to set webhook: $($setResponse.description)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error setting webhook: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Verify webhook status
Write-Host "🔍 Verifying webhook status..." -ForegroundColor Yellow
try {
    $statusResponse = Invoke-RestMethod -Uri "https://api.telegram.org/bot$BotToken/getWebhookInfo"
    
    Write-Host ""
    Write-Host "=== Webhook Status ===" -ForegroundColor Cyan
    Write-Host "URL: $($statusResponse.result.url)" -ForegroundColor White
    Write-Host "Pending Updates: $($statusResponse.result.pending_update_count)" -ForegroundColor White
    Write-Host "Max Connections: $($statusResponse.result.max_connections)" -ForegroundColor White
    
    if ($statusResponse.result.last_error_date) {
        $errorDate = [DateTimeOffset]::FromUnixTimeSeconds($statusResponse.result.last_error_date).LocalDateTime
        Write-Host "Last Error: $($statusResponse.result.last_error_message) at $errorDate" -ForegroundColor Red
    } else {
        Write-Host "Last Error: None" -ForegroundColor Green
    }
    
    Write-Host ""
    
    if ($statusResponse.result.url -eq $webhookUrl) {
        Write-Host "✅ Webhook correctly configured!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎉 You can now test the bot with: 'промочил ноги'" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Webhook URL mismatch!" -ForegroundColor Red
        Write-Host "Expected: $webhookUrl" -ForegroundColor Yellow
        Write-Host "Got: $($statusResponse.result.url)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error checking webhook status: $_" -ForegroundColor Red
    exit 1
}

