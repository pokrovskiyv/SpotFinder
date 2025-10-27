# Руководство по применению миграций

## Способ 1: Через Supabase Dashboard (рекомендуется для начала)

1. Откройте ваш проект в [Supabase Dashboard](https://app.supabase.com)
2. Перейдите в раздел "SQL Editor"
3. Выполните миграции по порядку:
   - Откройте файл `001_create_users_table.sql`
   - Скопируйте содержимое и вставьте в SQL Editor
   - Нажмите "Run"
   - Повторите для всех файлов по порядку (001 → 006)

## Способ 2: Через Supabase CLI (для продакшена)

### Установка Supabase CLI

```bash
# npm
npm install -g supabase

# или через scoop (Windows)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Инициализация проекта

```bash
# Войдите в Supabase
supabase login

# Свяжите проект
supabase link --project-ref your-project-ref
```

### Применение миграций

```bash
# Применить все миграции
supabase db push

# Или применить конкретную миграцию
supabase db push --include-all
```

## Проверка успешности миграций

Выполните в SQL Editor:

```sql
-- Проверка всех таблиц
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Должны увидеть:
-- places_cache
-- search_history
-- sessions
-- user_preferences
-- users

-- Проверка PostGIS
SELECT PostGIS_version();
```

## Откат миграций (если что-то пошло не так)

```sql
-- Удаление таблиц в обратном порядке
DROP TABLE IF EXISTS places_cache CASCADE;
DROP TABLE IF EXISTS search_history CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```

## Следующие шаги

После успешного применения миграций переходите к настройке Edge Functions.

