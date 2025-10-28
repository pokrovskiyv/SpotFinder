# ⚡ Быстрый старт SpotFinder Bot

Самое минимальное руководство для запуска бота за 15 минут.

## 🔒 Безопасность

**КРИТИЧЕСКИ ВАЖНО:** Перед началом работы прочитайте [SECURITY.md](SECURITY.md). Никогда не коммитьте файлы с реальными API ключами!

## Предварительные требования

- ✅ Аккаунт Supabase
- ✅ Telegram Bot Token
- ✅ Google/Gemini API ключи

## Шаг 1: Настройка API ключей (5 минут)

### Telegram Bot
1. Открой [@BotFather](https://t.me/BotFather) в Telegram
2. Отправь `/newbot`
3. Следуй инструкциям, получи токен
4. **НЕ КОММИТЬТЕ ТОКЕН!** Используйте переменные окружения

### Google/Gemini API
1. Перейди на [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Нажми "Get API Key"
3. **НЕ КОММИТЬТЕ КЛЮЧ!** Используйте переменные окружения

4. Перейди в [Google Cloud Console](https://console.cloud.google.com)
5. Включи "Places API (New)"
6. Создай API ключ
7. **НЕ КОММИТЬТЕ КЛЮЧ!** Используйте переменные окружения

## Шаг 2: Настройка переменных окружения

**Windows PowerShell:**
```powershell
$env:TELEGRAM_BOT_TOKEN = "your_telegram_token"
$env:GEMINI_API_KEY = "your_gemini_key"
$env:GOOGLE_MAPS_API_KEY = "your_google_maps_key"
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "your_service_role_key"
```

**Windows CMD:**
```cmd
set TELEGRAM_BOT_TOKEN=your_telegram_token
set GEMINI_API_KEY=your_gemini_key
set GOOGLE_MAPS_API_KEY=your_google_maps_key
set SUPABASE_URL=https://your-project.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Шаг 3: Настройка Supabase (5 минут)

### Создание проекта
1. Перейди на [supabase.com](https://supabase.com)
2. "New Project" → введи имя → Create
3. Дождись завершения создания

### Создание таблиц
1. Открой SQL Editor в Supabase Dashboard
2. Скопируй и выполни ПО ОЧЕРЕДИ каждый файл из `supabase/migrations/`:
   - `001_create_users_table.sql`
   - `002_create_sessions_table.sql`
   - `003_enable_postgis.sql`
   - `004_create_user_preferences_table.sql`
   - `005_create_search_history_table.sql`
   - `006_create_places_cache_table.sql`

## Шаг 4: Deploy бота (5 минут)

> ⚠️ **КРИТИЧЕСКИ ВАЖНО:** После развертывания используйте **правильный формат URL** для webhook!
> 
> - ✅ Правильно: `https://PROJECT.functions.supabase.co/telegram-webhook`
> - ❌ Неправильно: `https://PROJECT.supabase.co/functions/v1/telegram-webhook` (вызывает 401 ошибки!)
> 
> Подробнее: [WEBHOOK_SETUP.md](WEBHOOK_SETUP.md)

### Установка Supabase CLI

**Windows (PowerShell)**:
\`\`\`powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
\`\`\`

**Mac/Linux**:
\`\`\`bash
npm install -g supabase
\`\`\`

### Вход и связывание

\`\`\`bash
supabase login
supabase link --project-ref your-project-ref
\`\`\`

Найди `project-ref` в: Supabase Dashboard → Settings → General → Reference ID

### Настройка secrets

\`\`\`bash
supabase secrets set TELEGRAM_BOT_TOKEN="your_token"
supabase secrets set GEMINI_API_KEY="your_key"
supabase secrets set GOOGLE_MAPS_API_KEY="your_key"
supabase secrets set SUPABASE_URL="https://your-project.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
\`\`\`

Найди `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` в: Settings → API

### Deploy функции

\`\`\`bash
cd SpotFinder
supabase functions deploy telegram-webhook
\`\`\`

### Установка webhook (АВТОМАТИЧЕСКИ - РЕКОМЕНДУЕТСЯ)

**Используйте скрипт автоматической настройки:**

\`\`\`bash
# Установите переменные окружения
export TELEGRAM_BOT_TOKEN="your_token"
export SUPABASE_PROJECT_ID="your_project_id"

# Запустите скрипт
deno run --allow-env --allow-net scripts/setup-webhook.ts
\`\`\`

Скрипт автоматически:
- ✅ Использует **правильный формат URL** (`.functions.supabase.co`)
- ✅ Устанавливает webhook
- ✅ Проверяет статус и выявляет ошибки

### Установка webhook (ВРУЧНУЮ - если нужно)

**Windows (PowerShell)**:
\`\`\`powershell
$TOKEN = "your_telegram_token"
$PROJECT_ID = "your_supabase_project_id"  # Например: icnnwmjrprufrohiyfpm

# ВАЖНО: Используйте .functions.supabase.co (НЕ .supabase.co/functions/v1/)
$WEBHOOK_URL = "https://$PROJECT_ID.functions.supabase.co/telegram-webhook"

Invoke-RestMethod -Uri "https://api.telegram.org/bot$TOKEN/setWebhook" `
  -Method Post `
  -ContentType "application/json" `
  -Body "{`"url`": `"$WEBHOOK_URL`"}"
\`\`\`

**Mac/Linux/Git Bash**:
\`\`\`bash
# ВАЖНО: Используйте .functions.supabase.co (НЕ .supabase.co/functions/v1/)
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"https://${SUPABASE_PROJECT_ID}.functions.supabase.co/telegram-webhook\"}"
\`\`\`

> 📖 **Подробная документация:** [WEBHOOK_SETUP.md](WEBHOOK_SETUP.md)

## Шаг 4: Тестирование (2 минуты)

1. Открой бота в Telegram
2. Отправь `/start`
3. Поделись геолокацией
4. Отправь: "Найди кафе"

**Работает?** 🎉 Поздравляю! Бот запущен!

**Не работает?** См. раздел "Troubleshooting" ниже.

---

## Troubleshooting

### Бот не отвечает

**Проверка 1: Webhook установлен?**
\`\`\`bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
\`\`\`

Должен быть установлен URL. Если нет → повтори установку webhook.

**Проверка 2: Функция работает?**

Открой URL в браузере:
\`\`\`
https://xxxxx.supabase.co/functions/v1/telegram-webhook
\`\`\`

Должна быть ошибка "Method not allowed" (это нормально, функция работает только с POST).

**Проверка 3: Логи**
\`\`\`bash
supabase functions logs telegram-webhook --tail 20
\`\`\`

Ищи ошибки. Типичные проблемы:
- `Missing environment variable` → не все secrets установлены
- `Invalid API key` → проверь ключи
- `Failed to connect to database` → проверь SUPABASE_SERVICE_ROLE_KEY

### Бот отвечает, но не находит места

**Проверка: Google API активированы?**

1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Enabled APIs
2. Должны быть включены:
   - Generative Language API (Gemini)
   - Places API (New)

**Проверка: Биллинг настроен?**

Maps Platform требует настройки платежной информации (даже для free tier).

### Бот просит геолокацию, хотя я её отправил

**Решение**: Отправь геолокацию заново. Возможно прошло >20 минут (TTL).

---

## Следующие шаги

✅ **Бот работает!** Теперь можешь:

1. Протестировать все сценарии: [TESTING.md](./TESTING.md)
2. Настроить команды бота: `./scripts/setup-telegram-commands.sh`
3. Изучить полную документацию: [README.md](./README.md)
4. Кастомизировать промпты: `supabase/functions/_shared/prompts/system-prompts.ts`

## Полезные команды

### Просмотр логов (real-time)
\`\`\`bash
supabase functions logs telegram-webhook --follow
\`\`\`

### Проверка статуса бота
\`\`\`bash
# Windows PowerShell
$TOKEN = "your_token"
Invoke-RestMethod "https://api.telegram.org/bot$TOKEN/getMe"

# Bash
curl "https://api.telegram.org/bot<TOKEN>/getMe"
\`\`\`

### Проверка базы данных
\`\`\`sql
-- Сколько пользователей
SELECT COUNT(*) FROM users;

-- Последние запросы
SELECT * FROM search_history ORDER BY timestamp DESC LIMIT 10;
\`\`\`

### Redeploy после изменений
\`\`\`bash
supabase functions deploy telegram-webhook
\`\`\`

---

**Вопросы?** Открой issue на GitHub или напиши в Telegram.

**Понравилось?** ⭐ Star на GitHub!

