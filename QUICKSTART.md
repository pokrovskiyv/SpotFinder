# ⚡ Быстрый старт SpotFinder Bot

Самое минимальное руководство для запуска бота за 15 минут.

## Предварительные требования

- ✅ Аккаунт Supabase
- ✅ Telegram Bot Token
- ✅ Google/Gemini API ключи

## Шаг 1: Настройка API ключей (5 минут)

### Telegram Bot
1. Открой [@BotFather](https://t.me/BotFather) в Telegram
2. Отправь `/newbot`
3. Следуй инструкциям, получи токен
4. Сохрани токен: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

### Google/Gemini API
1. Перейди на [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Нажми "Get API Key"
3. Сохрани ключ

4. Перейди в [Google Cloud Console](https://console.cloud.google.com)
5. Включи "Places API (New)"
6. Создай API ключ
7. Сохрани ключ

## Шаг 2: Настройка Supabase (5 минут)

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

## Шаг 3: Deploy бота (5 минут)

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

Скопируй URL из вывода:
\`\`\`
https://xxxxx.supabase.co/functions/v1/telegram-webhook
\`\`\`

### Установка webhook

**Windows (PowerShell)**:
\`\`\`powershell
$TOKEN = "your_telegram_token"
$WEBHOOK_URL = "https://xxxxx.supabase.co/functions/v1/telegram-webhook"

Invoke-RestMethod -Uri "https://api.telegram.org/bot$TOKEN/setWebhook" `
  -Method Post `
  -ContentType "application/json" `
  -Body "{`"url`": `"$WEBHOOK_URL`"}"
\`\`\`

**Mac/Linux/Git Bash**:
\`\`\`bash
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://xxxxx.supabase.co/functions/v1/telegram-webhook"}'
\`\`\`

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

