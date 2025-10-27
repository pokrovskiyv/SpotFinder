# 🚀 Руководство по развертыванию SpotFinder Bot

## Предварительные требования

Перед началом убедитесь, что у вас есть:

- ✅ Telegram Bot Token
- ✅ Google/Gemini API ключи
- ✅ Supabase проект с настроенной базой данных
- ✅ Supabase CLI установлен

## Шаг 1: Подготовка базы данных

### 1.1. Применение миграций

Выполните все миграции из `supabase/migrations/` в SQL Editor:

\`\`\`bash
# Или через CLI
supabase db push
\`\`\`

### 1.2. Проверка таблиц

\`\`\`sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
\`\`\`

Должны увидеть: `users`, `sessions`, `user_preferences`, `search_history`, `places_cache`

## Шаг 2: Настройка Environment Variables

### 2.1. В Supabase Dashboard

Перейдите: **Project Settings → Edge Functions → Secrets**

Добавьте следующие переменные:

| Переменная | Описание | Где получить |
|------------|----------|--------------|
| `TELEGRAM_BOT_TOKEN` | Токен бота | @BotFather в Telegram |
| `GEMINI_API_KEY` | Ключ Gemini API | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `GOOGLE_MAPS_API_KEY` | Ключ Maps API | [Google Cloud Console](https://console.cloud.google.com) |
| `SUPABASE_URL` | URL вашего проекта | Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role ключ | Project Settings → API |

### 2.2. Через CLI

\`\`\`bash
supabase secrets set TELEGRAM_BOT_TOKEN=your_token_here
supabase secrets set GEMINI_API_KEY=your_key_here
supabase secrets set GOOGLE_MAPS_API_KEY=your_key_here
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key_here
\`\`\`

## Шаг 3: Deploy Edge Function

### 3.1. Проверка кода

\`\`\`bash
# Проверьте, что нет синтаксических ошибок
deno check supabase/functions/telegram-webhook/index.ts
\`\`\`

### 3.2. Deploy

\`\`\`bash
# Deploy функции
supabase functions deploy telegram-webhook --project-ref your-project-ref

# Или с no-verify (быстрее, но без проверок)
supabase functions deploy telegram-webhook --no-verify-jwt
\`\`\`

### 3.3. Получение URL функции

После deploy вы получите URL:
\`\`\`
https://your-project-ref.supabase.co/functions/v1/telegram-webhook
\`\`\`

Сохраните этот URL!

## Шаг 4: Настройка Telegram Webhook

### 4.1. Установка webhook

\`\`\`bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-project-ref.supabase.co/functions/v1/telegram-webhook",
    "allowed_updates": ["message", "callback_query"]
  }'
\`\`\`

### 4.2. Проверка webhook

\`\`\`bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
\`\`\`

Должны увидеть:
\`\`\`json
{
  "ok": true,
  "result": {
    "url": "https://your-project-ref.supabase.co/functions/v1/telegram-webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    ...
  }
}
\`\`\`

## Шаг 5: Тестирование

### 5.1. Базовый тест

1. Откройте бота в Telegram
2. Отправьте `/start`
3. Поделитесь геолокацией
4. Отправьте запрос: "Найди кафе"

### 5.2. Проверка логов

\`\`\`bash
# Real-time логи
supabase functions logs telegram-webhook --follow

# Последние логи
supabase functions logs telegram-webhook --tail 50
\`\`\`

### 5.3. Проверка базы данных

\`\`\`sql
-- Проверить созданных пользователей
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;

-- Проверить активные сессии
SELECT * FROM sessions WHERE location_timestamp > NOW() - INTERVAL '1 hour';

-- Проверить историю поиска
SELECT * FROM search_history ORDER BY timestamp DESC LIMIT 10;
\`\`\`

## Шаг 6: Мониторинг и обслуживание

### 6.1. Настройка алертов

В Supabase Dashboard:
- **Database → Logs** - настройте алерты на ошибки
- **Edge Functions → Logs** - мониторьте производительность

### 6.2. Регулярное обслуживание

\`\`\`sql
-- Очистка старых сессий (запускать раз в день)
DELETE FROM sessions 
WHERE updated_at < NOW() - INTERVAL '24 hours';

-- Очистка expired кэша
DELETE FROM places_cache 
WHERE cache_expires_at < NOW();

-- Очистка старой истории (опционально)
DELETE FROM search_history 
WHERE timestamp < NOW() - INTERVAL '90 days';
\`\`\`

### 6.3. Мониторинг API квот

Регулярно проверяйте:
- [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Quotas
- Gemini API usage
- Maps API usage

## Troubleshooting

### Проблема: Бот не отвечает

**Решение:**
1. Проверьте webhook: `curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"`
2. Проверьте логи: `supabase functions logs telegram-webhook`
3. Убедитесь, что все env переменные установлены

### Проблема: Ошибки в логах "Failed to connect to database"

**Решение:**
1. Проверьте `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY`
2. Убедитесь, что используете **service_role** ключ, а не anon
3. Проверьте RLS policies на таблицах

### Проблема: Gemini API errors

**Решение:**
1. Проверьте квоты в Google Cloud Console
2. Убедитесь, что API активированы
3. Проверьте корректность `GEMINI_API_KEY`

### Проблема: Maps API не возвращает результаты

**Решение:**
1. Убедитесь, что Places API (New) активирован
2. Проверьте биллинг в Google Cloud
3. Убедитесь, что API key не имеет IP ограничений (для начала)

## Production Checklist

Перед запуском в продакшен:

- [ ] Все миграции применены
- [ ] Все environment variables настроены
- [ ] Webhook установлен и работает
- [ ] Логи проверены, нет критических ошибок
- [ ] Базовые сценарии протестированы
- [ ] RLS policies включены на всех таблицах
- [ ] API квоты и биллинг настроены
- [ ] Алерты настроены для критических ошибок
- [ ] Backup стратегия определена
- [ ] Monitoring dashboard настроен

## Обновление (Re-deployment)

### Обновление кода функции

\`\`\`bash
# После изменений в коде
supabase functions deploy telegram-webhook
\`\`\`

### Применение новых миграций

\`\`\`bash
# Добавьте новую миграцию в supabase/migrations/
# Затем примените
supabase db push
\`\`\`

### Обновление secrets

\`\`\`bash
supabase secrets set NEW_SECRET=value
# Затем redeploy функцию
supabase functions deploy telegram-webhook
\`\`\`

## Откат (Rollback)

### Откат функции

\`\`\`bash
# Supabase сохраняет версии функций
# Можно откатиться через Dashboard → Edge Functions → History
\`\`\`

### Откат миграций

\`\`\`bash
# Через Dashboard → Database → Migrations → Revert
# Или вручную через SQL Editor
\`\`\`

## Масштабирование

### Для большого количества пользователей:

1. **Database connection pooling** - уже включен в Supabase
2. **Кэширование** - используйте `places_cache` агрессивно
3. **Rate limiting** - добавьте ограничения на уровне бота
4. **Monitoring** - используйте Supabase Analytics + custom metrics

## Поддержка

Если возникли проблемы:
1. Проверьте [Supabase Docs](https://supabase.com/docs)
2. Проверьте [Telegram Bot API Docs](https://core.telegram.org/bots/api)
3. Создайте issue в репозитории проекта

