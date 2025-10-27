# Скрипт исправления бота SpotFinder

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ИСПРАВЛЕНИЕ БОТА SPOTFINDER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$botToken = "8293206567:AAHhTdSzqSfdPCjIsSSQT0AbakebTZ_lX4c"
$webhookUrl = "https://icnnwmjrprufrohiyfpm.supabase.co/functions/v1/telegram-webhook"

# Шаг 1: Проверка текущего состояния
Write-Host "`n[ШАГ 1] Проверка текущего состояния webhook..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "https://api.telegram.org/bot$botToken/getWebhookInfo" -UseBasicParsing
    $json = $response.Content | ConvertFrom-Json
    
    Write-Host "URL: $($json.result.url)" -ForegroundColor White
    Write-Host "Pending updates: $($json.result.pending_update_count)" -ForegroundColor White
    
    if ($json.result.last_error_message) {
        Write-Host "`n❌ ОШИБКА: $($json.result.last_error_message)" -ForegroundColor Red
        Write-Host "Причина: Environment variables НЕ установлены в Supabase" -ForegroundColor Yellow
    } else {
        Write-Host "`n✅ Webhook работает без ошибок" -ForegroundColor Green
        Write-Host "Бот готов к работе!" -ForegroundColor Green
        exit 0
    }
} catch {
    Write-Host "❌ Не удалось проверить статус webhook" -ForegroundColor Red
}

# Шаг 2: Инструкции по установке переменных
Write-Host "`n[ШАГ 2] Инструкция по установке Environment Variables" -ForegroundColor Yellow
Write-Host "`n⚠️  ОБЯЗАТЕЛЬНО: Добавьте переменные через Supabase Dashboard:" -ForegroundColor Red
Write-Host "`nОткройте в браузере:" -ForegroundColor Cyan
Write-Host "https://app.supabase.com/project/icnnwmjrprufrohiyfpm/settings/functions" -ForegroundColor White

Write-Host "`nДобавьте следующие переменные:" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Name: TELEGRAM_BOT_TOKEN" -ForegroundColor White
Write-Host "Value: 8293206567:AAHhTdSzqSfdPCjIsSSQT0AbakebTZ_lX4c" -ForegroundColor Gray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Name: GEMINI_API_KEY" -ForegroundColor White
Write-Host "Value: AIzaSyBHQQrZ4qkbgcFlmZ5JhPZMJ2sr_7N6HsQ" -ForegroundColor Gray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Name: GOOGLE_MAPS_API_KEY" -ForegroundColor White
Write-Host "Value: AIzaSyDAP7MoXSnByka1ogItyCWoPmrq93CRF5g" -ForegroundColor Gray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Name: SUPABASE_URL" -ForegroundColor White
Write-Host "Value: https://icnnwmjrprufrohiyfpm.supabase.co" -ForegroundColor Gray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Name: SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor White
Write-Host "Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imljbm53bWpycHJ1ZnJvaGl5ZnBtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU3ODI4NSwiZXhwIjoyMDc3MTU0Mjg1fQ.IfQ3P_k0yGQhN38dyu4IrY3WGuN-77nIecBECT-jIFc" -ForegroundColor Gray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

Write-Host "`n⚠️  После добавления ВСЕХ переменных:" -ForegroundColor Yellow
Write-Host "1. Сделайте redeploy функции" -ForegroundColor White
Write-Host "2. Вернитесь в эту консоль" -ForegroundColor White
Write-Host "3. Нажмите Enter для продолжения" -ForegroundColor White

Read-Host "`nНажмите Enter после установки переменных в Dashboard"

# Шаг 3: Redeploy
Write-Host "`n[ШАГ 3] Redeploy функции..." -ForegroundColor Yellow

try {
    Write-Host "Деплоим telegram-webhook..." -ForegroundColor White
    npx supabase functions deploy telegram-webhook --no-verify-jwt
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Функция успешно задеплоена" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Функция деплоится через CLI... проверьте Dashboard" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Используйте Dashboard для redeploy:" -ForegroundColor Yellow
    Write-Host "https://app.supabase.com/project/icnnwmjrprufrohiyfpm/functions/telegram-webhook" -ForegroundColor White
}

# Шаг 4: Установка webhook
Write-Host "`n[ШАГ 4] Установка webhook..." -ForegroundColor Yellow

try {
    $setWebhookUrl = "https://api.telegram.org/bot$botToken/setWebhook?url=$webhookUrl"
    $response = Invoke-WebRequest -Uri $setWebhookUrl -UseBasicParsing
    $json = $response.Content | ConvertFrom-Json
    
    if ($json.ok) {
        Write-Host "✅ Webhook успешно установлен" -ForegroundColor Green
    } else {
        Write-Host "❌ Ошибка установки webhook" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Ошибка: $_" -ForegroundColor Red
}

# Шаг 5: Финальная проверка
Write-Host "`n[ШАГ 5] Финальная проверка..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "https://api.telegram.org/bot$botToken/getWebhookInfo" -UseBasicParsing
    $json = $response.Content | ConvertFrom-Json
    
    Write-Host "URL: $($json.result.url)" -ForegroundColor White
    Write-Host "Pending updates: $($json.result.pending_update_count)" -ForegroundColor White
    
    if ($json.result.last_error_message) {
        Write-Host "`n❌ Ошибка всё ещё есть: $($json.result.last_error_message)" -ForegroundColor Red
        Write-Host "`nПроверьте, что переменные установлены в Dashboard" -ForegroundColor Yellow
    } else {
        Write-Host "`n✅ БОТ РАБОТАЕТ!" -ForegroundColor Green
        Write-Host "Отправьте боту /start для проверки" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Не удалось проверить статус" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  ИСПРАВЛЕНИЕ ЗАВЕРШЕНО" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

