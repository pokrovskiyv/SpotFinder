# Быстрое развертывание системы аналитики

## 🚀 Шаг 1: Применить миграции

### Через Supabase Dashboard:

1. Откройте https://supabase.com/dashboard → ваш проект → SQL Editor

2. **Выполните SQL для обновления search_history:**
```sql
ALTER TABLE search_history 
ADD COLUMN IF NOT EXISTS results_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS top_result JSONB NULL;
```

3. **Создайте таблицу user_actions:**
```sql
CREATE TABLE IF NOT EXISTS user_actions (
    action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    place_id TEXT NULL,
    search_id UUID NULL REFERENCES search_history(search_id) ON DELETE SET NULL,
    metadata JSONB NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_actions_user_id ON user_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_action_type ON user_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_user_actions_place_id ON user_actions(place_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_search_id ON user_actions(search_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_created_at ON user_actions(created_at DESC);

ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage actions" ON user_actions 
    FOR ALL USING (true);
```

## 🔄 Шаг 2: Развернуть Edge Functions

```bash
# Перейти в корень проекта
cd C:\Projects\SpotFinder

# Развернуть функции
supabase functions deploy telegram-webhook
```

## ✅ Шаг 3: Проверить работу

### Проверка 1: История поиска
```sql
SELECT 
    query_text,
    results_count,
    top_result->>'name' as top_place,
    timestamp
FROM search_history
ORDER BY timestamp DESC
LIMIT 5;
```

### Проверка 2: Действия пользователей
```sql
SELECT 
    action_type,
    COUNT(*) as count
FROM user_actions
GROUP BY action_type;
```

### Проверка 3: Кэш мест
```sql
SELECT 
    name,
    last_fetched_at,
    cache_expires_at > NOW() as is_valid
FROM places_cache
ORDER BY last_fetched_at DESC
LIMIT 5;
```

## 📊 Полезные запросы

### Самые популярные места:
```sql
SELECT 
    place_id,
    COUNT(*) as views
FROM user_actions
WHERE action_type IN ('view_reviews', 'select_place')
    AND place_id IS NOT NULL
GROUP BY place_id
ORDER BY views DESC
LIMIT 10;
```

### Активные пользователи:
```sql
SELECT 
    u.first_name,
    COUNT(ua.action_id) as actions
FROM users u
JOIN user_actions ua ON u.user_id = ua.user_id
GROUP BY u.user_id, u.first_name
ORDER BY actions DESC
LIMIT 10;
```

## 🛠️ Устранение проблем

### Проблема: Таблицы не создаются
**Решение:** Проверьте права service role key в настройках проекта

### Проблема: Функции не видят новые таблицы
**Решение:** Пересоздайте функцию: `supabase functions deploy telegram-webhook --no-verify-jwt`

### Проблема: Кэш не работает
**Решение:** Убедитесь, что GeminiClient получает supabaseUrl и supabaseKey

## 📖 Детальная документация

См. полные руководства:
- [DATABASE_MIGRATION_GUIDE.md](./DATABASE_MIGRATION_GUIDE.md) - подробное руководство
- [ANALYTICS_IMPLEMENTATION_REPORT.md](./ANALYTICS_IMPLEMENTATION_REPORT.md) - технический отчет


