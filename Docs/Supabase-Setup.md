# Настройка Supabase для SpotFinder

## Что такое Supabase?

Supabase - это open-source альтернатива Firebase, построенная на PostgreSQL. Для нашего проекта SpotFinder она идеально подходит для хранения постоянных данных пользователей и их предпочтений.

## Настройка MCP Supabase в Cursor

### Шаг 1: Создайте проект в Supabase

1. Перейдите на [supabase.com](https://supabase.com)
2. Создайте новый проект
3. Запишите следующие данные:
   - `Project URL` (например: `https://xxxxx.supabase.co`)
   - `anon public` ключ (находится в Settings > API)
   - `service_role` ключ (находится в Settings > API, будьте осторожны с ним!)

### Шаг 2: Получите Service Role Key

⚠️ **ВНИМАНИЕ**: Service Role Key обходит Row Level Security (RLS). Используйте его только для административных операций и API запросов.

1. В Supabase Dashboard: Settings → API
2. Скопируйте "service_role" key (это секретный ключ!)

### Шаг 3: Обновите конфигурацию MCP

Отредактируйте файл `.cursor/mcp_config.json` и замените значения:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-supabase"
      ],
      "env": {
        "SUPABASE_PROJECT_URL": "https://ваш-проект.supabase.co",
        "SUPABASE_ANON_KEY": "ваш_anon_ключ",
        "SUPABASE_SERVICE_ROLE_KEY": "ваш_service_role_ключ"
      }
    }
  }
}
```

### Шаг 4: Перезапустите Cursor

После настройки конфигурации перезапустите Cursor IDE, чтобы MCP сервер загрузился.

## Создание таблиц в Supabase

После настройки подключения вы можете использовать MCP команды для создания таблиц из вашей модели данных (см. `Docs/Data-model.md`).

### Пример: Создание таблицы users

Используйте команду MCP `apply_migration` для создания таблиц:

**Миграция 1: Создание таблицы users**
```sql
CREATE TABLE users (
    user_id BIGINT PRIMARY KEY,
    telegram_username VARCHAR(100) NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NULL,
    language_code VARCHAR(10) DEFAULT 'ru',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Миграция 2: Создание таблицы user_preferences**
```sql
-- Установите расширение PostGIS для работы с геоданными
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE user_preferences (
    preference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    
    home_address TEXT NULL,
    home_location GEOMETRY(Point, 4326) NULL,
    work_address TEXT NULL,
    work_location GEOMETRY(Point, 4326) NULL,
    
    preferred_transport_mode VARCHAR(20) DEFAULT 'walking',
    dietary_restrictions TEXT[] NULL,
    profile_notes TEXT NULL,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Миграция 3: Создание таблицы search_history**
```sql
CREATE TABLE search_history (
    search_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(user_id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    query_text TEXT NOT NULL,
    location_lat DECIMAL(10, 7) NOT NULL,
    location_lon DECIMAL(10, 7) NOT NULL,
    
    gemini_response_text TEXT NULL,
    returned_place_ids TEXT[] NULL,
    
    selected_place_id TEXT NULL,
    user_rating INT NULL
);
```

**Миграция 4: Создание таблицы places_cache**
```sql
CREATE TABLE places_cache (
    place_id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    location GEOMETRY(Point, 4326),
    google_data_jsonb JSONB,
    last_fetched_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

## Включение Row Level Security (RLS)

Для безопасности данных включите RLS на таблицах:

```sql
-- Включить RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE places_cache ENABLE ROW LEVEL SECURITY;

-- Политики для users (пользователи могут читать/писать только свои данные)
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid()::bigint = user_id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid()::bigint = user_id);

-- Аналогично для других таблиц
```

## Использование MCP в разработке

После настройки вы сможете:

1. **Создавать миграции** через MCP команды
2. **Выполнять SQL запросы** напрямую
3. **Получать логи** для отладки
4. **Проверять безопасность** через advisors
5. **Генерировать TypeScript типы** для вашего frontend/backend

## Полезные ссылки

- [Документация Supabase](https://supabase.com/docs)
- [Документация MCP Supabase](https://github.com/modelcontextprotocol/servers/tree/main/src/supabase)
- [PostGIS документация](https://postgis.net/documentation/)


