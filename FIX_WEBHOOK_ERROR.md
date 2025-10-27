# 🔴 Проблема: Webhook возвращает 401 Unauthorized

## Причина

Функция `telegram-webhook` задеплоена, но **не может подключиться к Supabase** из-за отсутствующих или неправильных environment variables.

```
"last_error_message": "Wrong response from the webhook: 401 Unauthorized"
```

## Решение

### Установить Environment Variables для функции

1. Откройте: https://app.supabase.com/project/icnnwmjrprufrohiyfpm/functions/telegram-webhook/details

2. Перейдите в раздел **Environment Variables** или **Settings**

3. Добавьте следующие переменные:

```
TELEGRAM_BOT_TOKEN=8293206567:AAHhTdSzqSfdPCjIsSSQT0AbakebTZ_lX4c
GEMINI_API_KEY=<ваш ключ из .env.local>
GOOGLE_MAPS_API_KEY=<ваш ключ из .env.local>
SUPABASE_URL=https://icnnwmjrprufrohiyfpm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imljbm53bWpycHJ1ZnJvaGl5ZnBtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU3ODI4NSwiZXhwIjoyMDc3MTU0Mjg1fQ.IfQ3P_k0yGQhN38dyu4IrY3WGuN-77nIecBECT-jIFc
```

4. **Сохраните** изменения

5. **Redeploy функцию** (кнопка Deploy/Redeploy)

## Или через CLI (быстрее)

```powershell
# Установите secrets
cd c:\Projects\SpotFinder

npx supabase secrets set TELEGRAM_BOT_TOKEN="8293206567:AAHhTdSzqSfdPCjIsSSQT0AbakebTZ_lX4c"
npx supabase secrets set SUPABASE_URL="https://icnnwmjrprufrohiyfpm.supabase.co"
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imljbm53bWpycHJ1ZnJvaGl5ZnBtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU3ODI4NSwiZXhwIjoyMDc3MTU0Mjg1fQ.IfQ3P_k0yGQhN38dyu4IrY3WGuN-77nIecBECT-jIFc"

# Добавьте ключи из .env.local:
npx supabase secrets set GEMINI_API_KEY="<из .env.local>"
npx supabase secrets set GOOGLE_MAPS_API_KEY="<из .env.local>"

# Redeploy функцию
npx supabase functions deploy telegram-webhook
```

## Проверка после исправления

```powershell
$TOKEN = "8293206567:AAHhTdSzqSfdPCjIsSSQT0AbakebTZ_lX4c"
Invoke-RestMethod "https://api.telegram.org/bot$TOKEN/getWebhookInfo" | ConvertTo-Json -Depth 5
```

Должно быть: `"last_error_message": null` или отсутствовать

## Быстрый тест

Отправьте `/start` боту - должно прийти приветственное сообщение.

---

**Причина проблемы:** При деплое через CLI secrets не передаются автоматически.

