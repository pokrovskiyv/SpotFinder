# Install Telegram Webhook with CORRECT public URL

# Check if TELEGRAM_BOT_TOKEN is set
if (-not $env:TELEGRAM_BOT_TOKEN) {
    Write-Host "Error: TELEGRAM_BOT_TOKEN environment variable is not set" -ForegroundColor Red
    Write-Host "Please set it: `$env:TELEGRAM_BOT_TOKEN = 'YOUR_TOKEN'" -ForegroundColor Yellow
    exit 1
}

# CORRECT public webhook URL (без авторизации)
$webhookUrl = "https://icnnwmjrprufrohiyfpm.functions.supabase.co/telegram-webhook"

Write-Host "Setting webhook to: $webhookUrl" -ForegroundColor Green

# Set webhook
$response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$env:TELEGRAM_BOT_TOKEN/setWebhook" `
    -Method Post `
    -ContentType "application/json" `
    -Body (ConvertTo-Json -Compress @{
        url = $webhookUrl
        allowed_updates = @("message", "callback_query", "pre_checkout_query")
    })

Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Cyan

Write-Host ""
Write-Host "Checking webhook status..." -ForegroundColor Yellow

# Check webhook status
$status = Invoke-RestMethod -Uri "https://api.telegram.org/bot$env:TELEGRAM_BOT_TOKEN/getWebhookInfo"

Write-Host "Webhook Info: $($status | ConvertTo-Json)" -ForegroundColor Cyan

if ($status.result.url -eq $webhookUrl) {
    Write-Host ""
    Write-Host "✅ Webhook успешно установлен!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Webhook установлен неправильно. URL: $($status.result.url)" -ForegroundColor Red
}

