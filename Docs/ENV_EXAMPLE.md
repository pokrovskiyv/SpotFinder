# Environment Variables Configuration

## Файл `.env.example`

Создайте файл `.env` в корне проекта со следующим содержимым:

```env
# SpotFinder Environment Configuration
# 
# ВАЖНО: Никогда не коммитьте файл .env в Git!

# ============================================
# Supabase Configuration
# ============================================

# ID вашего проекта Supabase (например: icnnwmjrprufrohiyfpm)
SUPABASE_PROJECT_ID=your-project-id

# URL вашего проекта Supabase
# Формат: https://YOUR_PROJECT_ID.supabase.co
SUPABASE_URL=https://your-project-id.supabase.co

# Service Role Key из Supabase Dashboard
# Найти: Settings → API → service_role key
# ВАЖНО: Это секретный ключ с полным доступом к БД!
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ============================================
# Telegram Bot Configuration
# ============================================

# Telegram Bot Token от @BotFather
# Формат: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_BOT_TOKEN=your-bot-token

# ============================================
# Google AI Configuration
# ============================================

# Gemini API Key
# Получить: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your-gemini-api-key

# Google Maps API Key
# Получить: https://console.cloud.google.com
# Требуется: Places API (New) enabled
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# ============================================
# Environment Type
# ============================================

# Тип окружения: development | staging | production
ENVIRONMENT=development
```

## Настройка окружений

### Development (Локальная разработка)

```env
ENVIRONMENT=development
SUPABASE_PROJECT_ID=your-local-project-id
SUPABASE_URL=http://localhost:54321
TELEGRAM_BOT_TOKEN=your-test-bot-token
# ... остальные ключи
```

### Staging (Тестирование)

```env
ENVIRONMENT=staging
SUPABASE_PROJECT_ID=your-staging-project-id
SUPABASE_URL=https://staging-project.supabase.co
TELEGRAM_BOT_TOKEN=your-staging-bot-token
# ... остальные ключи
```

### Production (Продакшен)

```env
ENVIRONMENT=production
SUPABASE_PROJECT_ID=icnnwmjrprufrohiyfpm
SUPABASE_URL=https://your-project.supabase.co
TELEGRAM_BOT_TOKEN=your-production-bot-token
# ... остальные ключи
```

## Важные примечания

### 🔒 Безопасность

1. **Никогда не коммитьте .env файлы** - они уже в .gitignore
2. **Используйте разные ключи** для каждого окружения
3. **Регулярно ротируйте** Service Role Key
4. **Ограничьте доступ** к API ключам (IP whitelist где возможно)

### ⚠️ Webhook URL формат

Webhook URL генерируется автоматически в формате:
```
https://YOUR_PROJECT_ID.functions.supabase.co/telegram-webhook
```

**ВАЖНО:** Используйте `.functions.supabase.co` а НЕ `.supabase.co/functions/v1/`

Второй формат требует JWT авторизацию и вызовет 401 ошибки!

### 📝 Как получить ключи

**Supabase:**
- Dashboard → Settings → API → service_role key

**Telegram Bot:**
- Напишите @BotFather → /newbot

**Gemini API:**
- https://aistudio.google.com/app/apikey

**Google Maps API:**
- https://console.cloud.google.com → APIs & Services
- Включите: Places API (New)

