# Статус развертывания SpotFinder Bot

**Дата проверки:** 27 октября 2025  
**Проект:** SpotFinder (icnnwmjrprufrohiyfpm)

---

## Текущий статус

### API ключи (готово)

Все необходимые API ключи настроены в `.env.local`:

- ✅ **TELEGRAM_BOT_TOKEN**: Настроен
- ✅ **GEMINI_API_KEY**: Настроен
- ✅ **GOOGLE_MAPS_API_KEY**: Настроен
- ✅ **SUPABASE_URL**: Настроен (`https://icnnwmjrprufrohiyfpm.supabase.co`)
- ✅ **SUPABASE_SERVICE_ROLE_KEY**: Настроен
- ✅ **SUPABASE_ANON_KEY**: Настроен

### База данных (требует действия)

Статус таблиц в Supabase:

```
❌ users              - не создана
❌ sessions           - не создана
❌ user_preferences   - не создана
❌ search_history     - не создана
❌ places_cache       - не создана
```

**Действие требуется:** Применить миграции вручную через Supabase Dashboard.

### Supabase CLI

Статус CLI:
- ✅ Установлен через npm (`npm list -g supabase` показывает установку)
- ⚠️  Команда `supabase --version` не работает (возможно, путь не добавлен в PATH)

**Решение:** Использовать полный путь или альтернативный метод развертывания.

---

## Что нужно сделать

### Шаг 1: Применить миграции (15-20 минут)

Откройте детальную инструкцию: **`APPLY_MIGRATIONS_INSTRUCTIONS.md`**

**Краткая версия:**

1. Откройте [Supabase Dashboard](https://app.supabase.com/project/icnnwmjrprufrohiyfpm)
2. Перейдите в **SQL Editor** (левое меню)
3. Нажмите **"New query"**
4. Примените миграции по порядку:
   - Выполните SQL из `supabase/migrations/001_create_users_table.sql`
   - Выполните SQL из `supabase/migrations/002_create_sessions_table.sql`
   - Выполните SQL из `supabase/migrations/003_enable_postgis.sql`
   - Выполните SQL из `supabase/migrations/004_create_user_preferences_table.sql`
   - Выполните SQL из `supabase/migrations/005_create_search_history_table.sql`
   - Выполните SQL из `supabase/migrations/006_create_places_cache_table.sql`

5. Проверьте результат:
```powershell
.\verify-migrations.ps1
```

Должен вернуть: `SUCCESS! All tables have been created!`

### Шаг 2: Развернуть Edge Function (10 минут)

#### Вариант A: Через Supabase CLI (если работает)

Сначала проверьте, работает ли CLI:

```powershell
npx supabase --version
```

Если работает:

```powershell
# 1. Войти в Supabase
npx supabase login

# 2. Связать проект
npx supabase link --project-ref icnnwmjrprufrohiyfpm

# 3. Установить секреты
npx supabase secrets set TELEGRAM_BOT_TOKEN="8293206567:AAHhTdSzqSfdPCjIsSSQT0AbakebTZ_lX4c"
npx supabase secrets set GEMINI_API_KEY="AIzaSyBHQQrZ4qkbgcFlmZ5JhPZMJ2sr_7N6HsQ"
npx supabase secrets set GOOGLE_MAPS_API_KEY="AIzaSyDAP7MoXSnByka1ogItyCWoPmrq93CRF5g"
npx supabase secrets set SUPABASE_URL="https://icnnwmjrprufrohiyfpm.supabase.co"
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imljbm53bWpycHJ1ZnJvaGl5ZnBtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU3ODI4NSwiZXhwIjoyMDc3MTU0Mjg1fQ.IfQ3P_k0yGQhN38dyu4IrY3WGuN-77nIecBECT-jIFc"

# 4. Deploy функцию
npx supabase functions deploy telegram-webhook
```

#### Вариант B: Через Supabase Dashboard (альтернатива)

1. Откройте [Supabase Dashboard](https://app.supabase.com/project/icnnwmjrprufrohiyfpm/edge-functions)
2. Перейдите в **Edge Functions**
3. Нажмите **"Deploy from GitHub"** или используйте CLI
4. Установите секреты в Dashboard → Edge Functions → Secrets

Секреты для добавления:
```
TELEGRAM_BOT_TOKEN=8293206567:AAHhTdSzqSfdPCjIsSSQT0AbakebTZ_lX4c
GEMINI_API_KEY=AIzaSyBHQQrZ4qkbgcFlmZ5JhPZMJ2sr_7N6HsQ
GOOGLE_MAPS_API_KEY=AIzaSyDAP7MoXSnByka1ogItyCWoPmrq93CRF5g
SUPABASE_URL=https://icnnwmjrprufrohiyfpm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imljbm53bWpycHJ1ZnJvaGl5ZnBtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU3ODI4NSwiZXhwIjoyMDc3MTU0Mjg1fQ.IfQ3P_k0yGQhN38dyu4IrY3WGuN-77nIecBECT-jIFc
```

### Шаг 3: Настроить Telegram webhook (2 минуты)

Получите URL функции после деплоя (например: `https://icnnwmjrprufrohiyfpm.supabase.co/functions/v1/telegram-webhook`)

Затем выполните:

```powershell
$TOKEN = "8293206567:AAHhTdSzqSfdPCjIsSSQT0AbakebTZ_lX4c"
$WEBHOOK = "https://icnnwmjrprufrohiyfpm.supabase.co/functions/v1/telegram-webhook"

Invoke-RestMethod -Uri "https://api.telegram.org/bot$TOKEN/setWebhook" `
  -Method Post `
  -ContentType "application/json" `
  -Body (@{url=$WEBHOOK} | ConvertTo-Json)
```

Проверка:

```powershell
Invoke-RestMethod "https://api.telegram.org/bot$TOKEN/getWebhookInfo"
```

### Шаг 4: Тестирование (5 минут)

1. Откройте ваш бот в Telegram
2. Отправьте `/start`
3. Нажмите кнопку "Поделиться геолокацией"
4. Отправьте геолокацию
5. Отправьте: **"Найди кафе"**

Ожидаемый результат: Список кафе с кнопками для карты и маршрута.

---

## Полезные ссылки

- **Инструкция по миграциям:** `APPLY_MIGRATIONS_INSTRUCTIONS.md`
- **Скрипт проверки:** `verify-migrations.ps1`
- **Быстрый старт:** `QUICKSTART.md`
- **Полное руководство:** `NEXT_STEPS.md`
- **Supabase Dashboard:** https://app.supabase.com/project/icnnwmjrprufrohiyfpm

---

## Проверка прогресса

После выполнения каждого шага, проверить можно:

```powershell
# Проверка таблиц
.\verify-migrations.ps1

# Проверка webhook
$TOKEN = "8293206567:AAHhTdSzqSfdPCjIsSSQT0AbakebTZ_lX4c"
Invoke-RestMethod "https://api.telegram.org/bot$TOKEN/getWebhookInfo"
```

---

## Важные замечания

1. **API ключи НЕ в репозитории:** Файл `.env.local` добавлен в `.gitignore`
2. **Миграции применяются один раз:** После применения таблиц, повторять не нужно
3. **Secrets хранятся в Supabase:** После деплоя, secrets будут храниться в Supabase Dashboard
4. **Тестирование:** Обязательно протестируйте все функции перед использованием в продакшене

---

**Следующее действие:** Откройте `APPLY_MIGRATIONS_INSTRUCTIONS.md` и начните с Шага 1.

