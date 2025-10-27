# Настройка Google/Gemini API для SpotFinder

## Шаг 1: Создание проекта в Google Cloud Console

1. Перейдите на [Google Cloud Console](https://console.cloud.google.com)
2. Нажмите "Select a project" → "New Project"
3. Введите название проекта: `spotfinder-bot`
4. Нажмите "Create"

## Шаг 2: Активация необходимых API

### Активация Gemini API

1. В боковом меню выберите "APIs & Services" → "Library"
2. Найдите "Generative Language API" (Gemini API)
3. Нажмите "Enable"

### Активация Maps Platform APIs

Активируйте следующие API:
1. **Places API (New)** - для работы с местами
2. **Maps JavaScript API** - для отображения карт
3. **Geocoding API** - для работы с адресами
4. **Directions API** - для построения маршрутов (опционально для MVP)

## Шаг 3: Создание API ключей

### Gemini API Key

1. Перейдите на [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Нажмите "Get API Key" → "Create API key in new project" или выберите созданный проект
3. Скопируйте ключ и сохраните в безопасном месте
4. **Важно**: Этот ключ будет использоваться как `GEMINI_API_KEY`

### Google Maps Platform API Key

1. В Google Cloud Console: "APIs & Services" → "Credentials"
2. Нажмите "Create Credentials" → "API Key"
3. Скопируйте созданный ключ
4. Нажмите на ключ для настройки ограничений:
   - **Application restrictions**: None (для начала, потом настроите IP)
   - **API restrictions**: Выберите "Restrict key" и отметьте активированные APIs
5. Сохраните ключ как `GOOGLE_MAPS_API_KEY`

## Шаг 4: Настройка биллинга

⚠️ **ВАЖНО**: Google требует настройки биллинга для использования Maps Platform

1. В боковом меню: "Billing"
2. Нажмите "Link a billing account" или создайте новый
3. Следуйте инструкциям для добавления платежной информации

**Примерные цены (на момент написания):**
- Gemini API: $0.00035 за 1K символов (input), бесплатных запросов достаточно для MVP
- Places API (New): $0.032 за Text Search запрос
- **Совет**: Установите бюджетные оповещения в разделе "Billing" → "Budgets & alerts"

## Шаг 5: Сохранение ключей

Создайте файл `.env.local` в корне проекта (НЕ коммитьте его в git!):

```bash
# Google/Gemini API Keys
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

Эти ключи нужно будет добавить в Supabase Edge Functions environment variables.

## Проверка настройки

### Тест Gemini API

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "contents": [{
      "parts":[{"text": "Hello, Gemini!"}]
    }]
  }'
```

### Тест Maps API

```bash
curl "https://maps.googleapis.com/maps/api/place/textsearch/json?query=coffee&location=55.7558,37.6173&radius=1000&key=YOUR_API_KEY"
```

## Полезные ссылки

- [Gemini API Documentation](https://ai.google.dev/docs)
- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [Gemini API Pricing](https://ai.google.dev/pricing)
- [Maps Platform Pricing](https://mapsplatform.google.com/pricing/)

## Следующие шаги

После получения API ключей переходите к настройке Supabase базы данных.

