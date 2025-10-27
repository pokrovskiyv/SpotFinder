# Инструкция: Применение миграций Supabase для SpotFinder

## ⚠️ Важно

REST API Supabase не поддерживает прямое выполнение произвольного SQL.  
Миграции необходимо применить через **Supabase Dashboard** (веб-интерфейс).

## 📋 Пошаговая инструкция

### Шаг 1: Откройте Supabase Dashboard

1. Перейдите по ссылке: **https://app.supabase.com**
2. Войдите в свой аккаунт
3. Выберите проект **SpotFinder** (`icnnwmjrprufrohiyfpm`)

### Шаг 2: Откройте SQL Editor

1. В левом меню найдите раздел **"SQL Editor"**
2. Нажмите на кнопку **"New query"**

### Шаг 3: Примените миграции по порядку

Выполните каждую миграцию **строго по порядку**:

#### Миграция 1: Создание таблицы users

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT PRIMARY KEY,
    telegram_username VARCHAR(100) NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NULL,
    language_code VARCHAR(10) DEFAULT 'ru',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_telegram_username ON users(telegram_username);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen_at);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies (users can read/write only their own data)
CREATE POLICY "Users can read own data" ON users 
    FOR SELECT USING (true); -- Allow service role to read all

CREATE POLICY "Users can insert own data" ON users 
    FOR INSERT WITH CHECK (true); -- Allow service role to insert

CREATE POLICY "Users can update own data" ON users 
    FOR UPDATE USING (true); -- Allow service role to update
```

**→ Скопируйте SQL выше, вставьте в редактор, нажмите "Run" (или Ctrl+Enter)**

---

#### Миграция 2: Создание таблицы sessions

```sql
-- Create sessions table for managing user state
CREATE TABLE IF NOT EXISTS sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Geolocation context
    current_location_lat DECIMAL(10, 7) NULL,
    current_location_lon DECIMAL(10, 7) NULL,
    location_timestamp TIMESTAMP WITH TIME ZONE NULL,
    
    -- Dialog context
    last_query TEXT NULL,
    last_results JSONB NULL, -- Array of {place_id, name, ...}
    conversation_state VARCHAR(50) DEFAULT 'default', -- 'default', 'awaiting_location', 'awaiting_followup'
    
    -- Session management
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at);

-- Enable RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Service role can manage sessions" ON sessions 
    FOR ALL USING (true);
```

**→ Скопируйте SQL выше, вставьте в редактор, нажмите "Run"**

---

#### Миграция 3: Включение PostGIS

```sql
-- Enable PostGIS extension for geospatial data
CREATE EXTENSION IF NOT EXISTS postgis;
```

**→ Скопируйте SQL выше, вставьте в редактор, нажмите "Run"**

---

#### Миграция 4: Создание таблицы user_preferences

```sql
-- Create user_preferences table for personalization
CREATE TABLE IF NOT EXISTS user_preferences (
    preference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Saved locations
    home_address TEXT NULL,
    home_location GEOMETRY(Point, 4326) NULL,
    work_address TEXT NULL,
    work_location GEOMETRY(Point, 4326) NULL,
    
    -- Search preferences
    preferred_transport_mode VARCHAR(20) DEFAULT 'walking', -- 'walking', 'driving', 'public'
    dietary_restrictions TEXT[] NULL, -- Array: ['vegan', 'gluten_free']
    
    -- Smart field: free text for Gemini context
    profile_notes TEXT NULL, -- "User prefers quiet places", "likes Asian cuisine"
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spatial indexes for geolocation queries
CREATE INDEX IF NOT EXISTS idx_user_prefs_home_location ON user_preferences USING GIST(home_location);
CREATE INDEX IF NOT EXISTS idx_user_prefs_work_location ON user_preferences USING GIST(work_location);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Service role can manage preferences" ON user_preferences 
    FOR ALL USING (true);
```

**→ Скопируйте SQL выше, вставьте в редактор, нажмите "Run"**

---

#### Миграция 5: Создание таблицы search_history

```sql
-- Create search_history table for analytics
CREATE TABLE IF NOT EXISTS search_history (
    search_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(user_id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Input data
    query_text TEXT NOT NULL,
    location_lat DECIMAL(10, 7) NOT NULL,
    location_lon DECIMAL(10, 7) NOT NULL,
    
    -- Output data
    gemini_response_text TEXT NULL,
    returned_place_ids TEXT[] NULL,
    
    -- User feedback (critical for improvement!)
    selected_place_id TEXT NULL,
    user_rating INT NULL CHECK (user_rating >= 1 AND user_rating <= 5)
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_timestamp ON search_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_location ON search_history(location_lat, location_lon);

-- Enable RLS
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Service role can manage history" ON search_history 
    FOR ALL USING (true);
```

**→ Скопируйте SQL выше, вставьте в редактор, нажмите "Run"**

---

#### Миграция 6: Создание таблицы places_cache

```sql
-- Create places_cache table for API call optimization
CREATE TABLE IF NOT EXISTS places_cache (
    place_id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    location GEOMETRY(Point, 4326),
    
    -- Cache raw JSON response to avoid parsing all fields
    google_data_jsonb JSONB,
    
    last_fetched_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- For cache invalidation
    cache_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_places_cache_location ON places_cache USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_places_cache_expires ON places_cache(cache_expires_at);
CREATE INDEX IF NOT EXISTS idx_places_cache_name ON places_cache(name);

-- Enable RLS
ALTER TABLE places_cache ENABLE ROW LEVEL SECURITY;

-- Policies (cache is read-only for everyone, write for service role)
CREATE POLICY "Anyone can read cache" ON places_cache 
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage cache" ON places_cache 
    FOR ALL USING (true);
```

**→ Скопируйте SQL выше, вставьте в редактор, нажмите "Run"**

---

### Шаг 4: Проверка результата

После применения всех миграций выполните проверочный запрос:

```sql
-- Проверка созданных таблиц
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Ожидаемый результат (5 таблиц):**
- `places_cache`
- `search_history`
- `sessions`
- `user_preferences`
- `users`

---

### Шаг 5: Проверка PostGIS

```sql
-- Проверка установки PostGIS
SELECT PostGIS_version();
```

Должна вернуться версия PostGIS (например, `3.4 USE_GEOS=1 USE_PROJ=1...`).

---

## ✅ Готово!

После успешного применения всех миграций:

1. База данных настроена и готова к работе
2. Все таблицы созданы с правильными индексами и RLS политиками
3. PostGIS расширение включено для геопространственных запросов

### Следующие шаги:

- Развернуть Edge Functions в Supabase
- Настроить Telegram webhook
- Протестировать бота

---

## 🔄 Откат (если нужно начать заново)

Если что-то пошло не так, удалите все таблицы:

```sql
DROP TABLE IF EXISTS places_cache CASCADE;
DROP TABLE IF EXISTS search_history CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP EXTENSION IF EXISTS postgis CASCADE;
```

После этого можно применить миграции заново.

