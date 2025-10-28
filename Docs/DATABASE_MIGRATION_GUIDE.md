# Руководство по применению миграций базы данных

## Обзор изменений

Данное обновление включает исправления критических багов с записью данных и добавление полной системы аналитики:

### Новые возможности:
1. ✅ **Исправлена запись истории поиска** - добавлены поля `results_count` и `top_result`
2. ✅ **Кэширование мест** - оптимизация API запросов к Google Places
3. ✅ **Отслеживание действий** - полная аналитика поведения пользователей
4. ✅ **Улучшенная аналитика** - детальное логирование всех взаимодействий

### Затронутые таблицы:
- `search_history` - добавлены новые поля для аналитики
- `user_actions` - новая таблица для отслеживания действий
- `places_cache` - используется для кэширования (уже существует)

## Применение миграций

### Вариант 1: Автоматическое применение (рекомендуется)

Если вы используете Supabase CLI и уже имеете файлы миграций:

```bash
# Перейти в корень проекта
cd C:\Projects\SpotFinder

# Применить все миграции
supabase db push

# Или применить через GitHub Actions (если настроено)
git add .
git commit -m "feat: add analytics and caching system"
git push origin main
```

### Вариант 2: Ручное применение через Supabase Dashboard

1. **Откройте Supabase Dashboard**
   - Перейдите на https://supabase.com/dashboard
   - Выберите ваш проект SpotFinder

2. **Примените изменения к search_history**
   
   Перейдите в SQL Editor и выполните:
   
   ```sql
   -- Добавить новые поля в search_history
   ALTER TABLE search_history 
   ADD COLUMN IF NOT EXISTS results_count INT DEFAULT 0,
   ADD COLUMN IF NOT EXISTS top_result JSONB NULL;
   ```

3. **Создайте таблицу user_actions**
   
   ```sql
   -- Создать таблицу для отслеживания действий
   CREATE TABLE IF NOT EXISTS user_actions (
       action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
       action_type VARCHAR(50) NOT NULL,
       place_id TEXT NULL,
       search_id UUID NULL REFERENCES search_history(search_id) ON DELETE SET NULL,
       metadata JSONB NULL,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Создать индексы для аналитики
   CREATE INDEX IF NOT EXISTS idx_user_actions_user_id ON user_actions(user_id);
   CREATE INDEX IF NOT EXISTS idx_user_actions_action_type ON user_actions(action_type);
   CREATE INDEX IF NOT EXISTS idx_user_actions_place_id ON user_actions(place_id);
   CREATE INDEX IF NOT EXISTS idx_user_actions_search_id ON user_actions(search_id);
   CREATE INDEX IF NOT EXISTS idx_user_actions_created_at ON user_actions(created_at DESC);

   -- Включить RLS
   ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;

   -- Политики доступа
   CREATE POLICY "Service role can manage actions" ON user_actions 
       FOR ALL USING (true);
   ```

4. **Проверьте результат**
   
   ```sql
   -- Проверить структуру search_history
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'search_history';

   -- Проверить создание user_actions
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'user_actions';
   ```

## Проверка работы новых функций

### 1. Проверка записи в search_history

После развертывания сделайте несколько поисков в боте и проверьте:

```sql
-- Посмотреть последние записи истории поиска
SELECT 
    search_id,
    user_id,
    query_text,
    results_count,
    top_result->>'name' as top_place_name,
    timestamp
FROM search_history
ORDER BY timestamp DESC
LIMIT 10;
```

### 2. Проверка отслеживания действий

После взаимодействия с ботом (просмотр отзывов, выбор мест, построение маршрутов):

```sql
-- Посмотреть последние действия пользователей
SELECT 
    action_id,
    user_id,
    action_type,
    place_id,
    created_at
FROM user_actions
ORDER BY created_at DESC
LIMIT 20;

-- Статистика по типам действий
SELECT 
    action_type,
    COUNT(*) as count
FROM user_actions
GROUP BY action_type
ORDER BY count DESC;
```

### 3. Проверка кэширования

```sql
-- Посмотреть что попало в кэш
SELECT 
    place_id,
    name,
    last_fetched_at,
    cache_expires_at,
    cache_expires_at > NOW() as is_valid
FROM places_cache
ORDER BY last_fetched_at DESC
LIMIT 10;
```

## Аналитические запросы

### Самые популярные места

```sql
SELECT 
    place_id,
    COUNT(*) as view_count
FROM user_actions
WHERE action_type IN ('view_reviews', 'select_place')
    AND place_id IS NOT NULL
GROUP BY place_id
ORDER BY view_count DESC
LIMIT 10;
```

### Активность пользователей

```sql
SELECT 
    u.user_id,
    u.first_name,
    COUNT(ua.action_id) as total_actions,
    COUNT(DISTINCT DATE(ua.created_at)) as active_days
FROM users u
LEFT JOIN user_actions ua ON u.user_id = ua.user_id
GROUP BY u.user_id, u.first_name
ORDER BY total_actions DESC
LIMIT 20;
```

### Конверсия поиска в выбор

```sql
SELECT 
    DATE(sh.timestamp) as date,
    COUNT(DISTINCT sh.search_id) as total_searches,
    COUNT(DISTINCT sh.selected_place_id) as searches_with_selection,
    ROUND(
        COUNT(DISTINCT sh.selected_place_id)::numeric / 
        NULLIF(COUNT(DISTINCT sh.search_id), 0) * 100, 
        2
    ) as conversion_rate
FROM search_history sh
WHERE sh.timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE(sh.timestamp)
ORDER BY date DESC;
```

## Откат изменений (если необходимо)

### Удаление новых полей из search_history:

```sql
ALTER TABLE search_history 
DROP COLUMN IF EXISTS results_count,
DROP COLUMN IF EXISTS top_result;
```

### Удаление таблицы user_actions:

```sql
DROP TABLE IF EXISTS user_actions CASCADE;
```

## Производительность

### Мониторинг размера кэша:

```sql
SELECT 
    COUNT(*) as total_entries,
    COUNT(*) FILTER (WHERE cache_expires_at > NOW()) as valid_entries,
    COUNT(*) FILTER (WHERE cache_expires_at <= NOW()) as expired_entries,
    pg_size_pretty(pg_total_relation_size('places_cache')) as table_size
FROM places_cache;
```

### Очистка устаревшего кэша:

```sql
DELETE FROM places_cache 
WHERE cache_expires_at < NOW();
```

## Поддержка

При возникновении проблем:
1. Проверьте логи Edge Functions в Supabase Dashboard
2. Убедитесь, что все миграции применены корректно
3. Проверьте, что service role key имеет доступ ко всем таблицам

## Следующие шаги

После успешного применения миграций:
1. ✅ Протестируйте бота на различных сценариях
2. ✅ Проверьте заполнение всех таблиц данными
3. ✅ Настройте дашборд для мониторинга аналитики
4. ✅ Периодически очищайте устаревший кэш


