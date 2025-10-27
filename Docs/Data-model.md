Я отвечу как **Главный Архитектор GeoAI-систем** и лауреат награды **"Digital Infrastructure Excellence"**.

Отличный следующий шаг. Архитектура описывает *поток*, а модель данных описывает *состояние* системы. Неверная модель данных — это технический долг, который убьет ваш продукт.

**TL;DR**: Вам нужна **двухкомпонентная модель данных**.

1.  **Хранилище Сессий (Кэш)**: Быстрое, временное, для управления *текущим* диалогом (например, Redis).
2.  **Постоянная База Данных (БД)**: Постоянная, структурированная, для хранения *долгосрочной* информации о пользователях и их предпочтениях (например, PostgreSQL).

Нельзя хранить временное состояние (геолокацию) в медленной БД, и нельзя хранить постоянные предпочтения (веган) в кэше, который может очиститься.

-----

### Модель 1: Хранилище Сессий (Кэш, например, Redis)

Эта модель — "краткосрочная память" бота. Она критически важна для обработки уточнений и управления контекстом "прямо сейчас".

  * **Назначение**: Управление состоянием диалога. Хранение временных данных, которые нужны для ответа на *следующий* запрос пользователя.
  * **Структура**: Key-Value.

**Ключ**: `session:<telegram_user_id>` (например, `session:123456789`)

**Значение**: Объект JSON (с TTL — Time-To-Live, например, 30 минут)

```json
{
  // 1. Контекст Геолокации
  "current_location": {
    "lat": 55.751244,
    "lon": 37.618423,
    "timestamp": 1678886400 // Метка времени, когда локация получена
                          // (Обязательно, чтобы считать ее "протухшей" через 15-20 мин)
  },

  // 2. Контекст Диалога (для уточнений)
  "last_query": "Найди мне тихое кафе с Wi-Fi",
  "last_results_set": [
    // Набор ID мест из последнего ответа
    { "place_id": "ChIJ...", "name": "Кафе 'Уют'" },
    { "place_id": "ChIJ...", "name": "Кофе-Хаб 'Розетка'" },
    { "place_id": "ChIJ...", "name": "Ресторан 'Тишина'" }
  ],
  "conversation_state": "awaiting_followup" // "default", "awaiting_location"
}
```

**Почему это важно**:

  * Когда пользователь пишет "а у второго есть парковка?", Оркестратор смотрит в `last_results_set[1]`, берет `place_id` ("Кофе-Хаб 'Розетка'") и делает *новый*, уточняющий запрос к Gemini.
  * `timestamp` в `current_location` позволяет боту сказать: "Я давно не знаю, где вы. Пожалуйста, обновите геолокацию".

-----

### Модель 2: Постоянная База Данных (БД, например, PostgreSQL)

Эта модель — "долгосрочная память" бота. Она хранит данные о пользователе и его предпочтениях для персонализации и аналитики. Я буду использовать синтаксис SQL для наглядности.

#### Таблица 1: `users`

  * **Назначение**: Хранение основной информации о пользователе, полученной из Telegram.

<!-- end list -->

```sql
CREATE TABLE users (
    user_id BIGINT PRIMARY KEY, -- Telegram User ID
    telegram_username VARCHAR(100) NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NULL,
    language_code VARCHAR(10) DEFAULT 'ru',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Таблица 2: `user_preferences`

  * **Назначение**: Ядро персонализации (Ось 1 и 2 вашей мета-модели). Здесь хранятся "вечные" предпочтения пользователя, которые Gemini будет учитывать *в каждом запросе*.

<!-- end list -->

```sql
CREATE TABLE user_preferences (
    preference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Сохраненные локации
    home_address TEXT NULL,
    home_location GEOMETRY(Point, 4326) NULL, -- Для гео-запросов (PostGIS)
    work_address TEXT NULL,
    work_location GEOMETRY(Point, 4326) NULL,

    -- Предпочтения для поиска
    preferred_transport_mode VARCHAR(20) DEFAULT 'walking', -- 'walking', 'driving', 'public'
    dietary_restrictions TEXT[] NULL, -- Массив строк: ['vegan', 'gluten_free']
    
    -- "Умное" поле: свободный текст для Gemini
    -- Сюда бот может записывать выводы: "пользователь любит тихие места", "предпочитает азиатскую кухню", "ищет места с доступом для коляски"
    profile_notes TEXT NULL,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Таблица 3: `search_history`

  * **Назначение**: Сбор данных для аналитики, обучения и улучшения сервиса.

<!-- end list -->

```sql
CREATE TABLE search_history (
    search_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(user_id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Входные данные
    query_text TEXT NOT NULL,
    location_lat DECIMAL(10, 7) NOT NULL,
    location_lon DECIMAL(10, 7) NOT NULL,
    
    -- Выходные данные
    gemini_response_text TEXT NULL,
    returned_place_ids TEXT[] NULL, -- Массив Place IDs, которые вернул Gemini
    
    -- Обратная связь (самое важное!)
    selected_place_id TEXT NULL, -- На какую кнопку/место нажал пользователь?
    user_rating INT NULL -- (1-5 звезд)
);
```

#### Таблица 4: `places_cache` (Опционально, но рекомендуется)

  * **Назначение**: Экономия денег на API-звонках Google. Если вы часто запрашиваете одно и то же место, его данные (адрес, часы работы) можно кэшировать.

<!-- end list -->

```sql
CREATE TABLE places_cache (
    place_id VARCHAR(255) PRIMARY KEY, -- Google Place ID
    name VARCHAR(255) NOT NULL,
    address TEXT,
    location GEOMETRY(Point, 4326),
    -- Кэшируем сырой JSON ответа, чтобы не парсить все поля
    google_data_jsonb JSONB, 
    last_fetched_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

Эта двухкомпонентная модель (Redis для *состояния*, Postgres для *данных*) дает вам одновременно скорость реакции в диалоге и глубину для персонализации и аналитики.