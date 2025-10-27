# Быстрое развертывание SpotFinder Bot

## Текущий статус

✅ **API ключи настроены** в `.env.local`  
❌ **Таблицы БД не созданы** - требуется применить миграции  
❌ **Edge Function не развернута** - требуется deploy

---

## Шаг 1: Применить миграции БД (15 мин)

### Вариант A: Через Dashboard (рекомендуется)

1. Откройте: https://app.supabase.com/project/icnnwmjrprufrohiyfpm
2. Перейдите в **SQL Editor** → New query
3. Скопируйте и выполните SQL из каждого файла миграции:
   - `001_create_users_table.sql`
   - `002_create_sessions_table.sql`
   - `003_enable_postgis.sql`
   - `004_create_user_preferences_table.sql`
   - `005_create_search_history_table.sql`
   - `006_create_places_cache_table.sql`

4. Проверка:
```powershell
.\verify-migrations.ps1
```

Должно вернуть: ✅ `SUCCESS! All tables have been created!`

### Вариант B: Автоматически (если Supabase CLI работает)

```powershell
# Применить миграции
npx supabase db push

# Или вручную через CLI
npx supabase link --project-ref icnnwmjrprufrohiyfpm
npx supabase migration up
```

---

## Шаг 2: Deploy Edge Function (10 мин)

### Через Supabase CLI

```powershell
# 1. Установить секреты
npx supabase secrets set TELEGRAM_BOT_TOKEN="8293206567:AAHhTdSzqSfdPCjIsSSQT0AbakebTZ_lX4c"
npx supabase secrets set GEMINI_API_KEY="AIzaSyBHQQrZ4qkbgcFlmZ5JhPZMJ2sr_7N6HsQ"
npx supabase secrets set GOOGLE_MAPS_API_KEY="AIzaSyDAP7MoXSnByka1ogItyCWoPmrq93CRF5g"
npx supabase secrets set SUPABASE_URL="https://icnnwmjrprufrohiyfpm.supabase.co"
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imljbm53bWpycHJ1ZnJvaGl5ZnBtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU3ODI4NSwiZXhwIjoyMDc3MTU0Mjg1fQ.IfQ3P_k0yGQhN38dyu4IrY3WGuN-77nIecBECT-jIFc"

# 2. Deploy функцию
npx supabase functions deploy telegram-webhook
```

Скопируйте URL из вывода (например: `https://icnnwmjrprufrohiyfpm.supabase.co/functions/v1/telegram-webhook`)

---

## Шаг 3: Настроить Telegram webhook (2 мин)

Замените `<FUNCTION_URL>` на URL из предыдущего шага:

```powershell
$TOKEN = "8293206567:AAHhTdSzqSfdPCjIsSSQT0AbakebTZ_lX4c"
$WEBHOOK = "<FUNCTION_URL>"

Invoke-RestMethod -Uri "https://api.telegram.org/bot$TOKEN/setWebhook" `
  -Method Post `
  -ContentType "application/json" `
  -Body (@{url=$WEBHOOK} | ConvertTo-Json)
```

Проверка webhook:

```powershell
Invoke-RestMethod "https://api.telegram.org/bot$TOKEN/getWebhookInfo"
```

Должно вернуть: `"url": "https://...functions/v1/telegram-webhook"`

---

## Шаг 4: Тестирование

1. Откройте бота в Telegram
2. Отправьте `/start`
3. Нажмите **"Поделиться геолокацией"**
4. Отправьте геолокацию
5. Напишите: **"Найди кафе"**

**Ожидаемый результат:** Список кафе с картой, маршрутом и деталями.

---

## Troubleshooting

### Таблицы не создаются
- Проверьте выполнение SQL: в Dashboard должно быть "Success" для каждого запроса
- Проверьте логи: Dashboard → Logs → SQL Editor

### Edge Function не работает
- Проверьте logs: `npx supabase functions logs telegram-webhook`
- Проверьте secrets: `npx supabase secrets list`

### Webhook не работает
- Проверьте URL функции в браузере (должна быть ошибка "Method not allowed" - это нормально)
- Проверьте наличие всех secrets в Supabase

---

## Что дальше?

- ✅ Запустите тесты из `TESTING.md`
- ✅ Пригласите друзей для beta-тестирования
- ✅ Мониторьте логи: `npx supabase functions logs telegram-webhook --follow`

