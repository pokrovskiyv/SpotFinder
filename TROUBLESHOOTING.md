# 🔧 Устранение неполадок SpotFinder Bot

**Дата:** 27 октября 2025  
**Проблема:** Бот не отвечает на сообщения в Telegram

---

## ✅ Проверено и работает

### 1. База данных
```
✅ users - существует
✅ sessions - существует
✅ user_preferences - существует
✅ search_history - существует
✅ places_cache - существует
```

### 2. Секреты (Environment Variables)
```
✅ TELEGRAM_BOT_TOKEN - установлен
✅ GEMINI_API_KEY - установлен
✅ GOOGLE_MAPS_API_KEY - установлен
✅ SUPABASE_URL - установлен
✅ SUPABASE_SERVICE_ROLE_KEY - установлен
✅ SUPABASE_ANON_KEY - установлен
✅ SUPABASE_DB_URL - установлен
```

### 3. Edge Function
```
✅ Функция: telegram-webhook
✅ Статус: ACTIVE
✅ Версия: 1
✅ Обновлена: 2025-10-27 16:36:09 UTC
```

### 4. Telegram Webhook
```
✅ URL: https://icnnwmjrprufrohiyfpm.supabase.co/functions/v1/telegram-webhook
✅ pending_update_count: 0
✅ allowed_updates: message, callback_query
✅ Ошибок нет
```

---

## ❓ Текущая проблема

**Симптомы:**
- Пользователь отправил `/start` в 17:38
- Пользователь отправил геолокацию в 17:38
- Пользователь отправил текстовый запрос в 17:39
- **Бот не отвечает ни на одно сообщение**

**Статус webhook:**
- `pending_update_count` = 0 (обновления не застряли в очереди)
- Нет `last_error_message` (нет явных ошибок от Telegram)

---

## 🔍 Необходимые проверки

### 1. Проверить логи Edge Function

**Через Supabase Dashboard:**

1. Откройте: https://supabase.com/dashboard/project/icnnwmjrprufrohiyfpm/logs/edge-logs
2. Выберите функцию `telegram-webhook`
3. Установите временной диапазон: последние 15 минут
4. Ищите записи с временными метками 17:38–17:40

**Что искать:**
- ✅ Записи "Received update" — значит webhook получает данные
- ❌ Записи с ошибками (красные) — значит есть проблема в коде
- ❌ Пустые логи — значит webhook вообще не вызывается

### 2. Проверить вызов функции вручную

**Через Dashboard:**

1. Откройте: https://supabase.com/dashboard/project/icnnwmjrprufrohiyfpm/functions/telegram-webhook
2. Нажмите "Invoke"
3. Используйте тестовый payload:

```json
{
  "update_id": 123456789,
  "message": {
    "message_id": 1,
    "from": {
      "id": 123456,
      "is_bot": false,
      "first_name": "Test"
    },
    "chat": {
      "id": 123456,
      "type": "private"
    },
    "date": 1730048280,
    "text": "/start"
  }
}
```

4. Проверьте ответ функции

**Ожидаемый результат:**
```json
{
  "ok": true
}
```

### 3. Проверить данные в базе

**Через SQL Editor:**

```sql
-- Проверить, создаются ли пользователи
SELECT * FROM users ORDER BY created_at DESC LIMIT 5;

-- Проверить, создаются ли сессии
SELECT * FROM sessions ORDER BY updated_at DESC LIMIT 5;

-- Проверить историю поиска
SELECT * FROM search_history ORDER BY timestamp DESC LIMIT 5;
```

**Что проверяем:**
- Если таблицы пустые → функция не вызывается или падает до записи в БД
- Если есть данные → функция работает, но не отправляет ответы в Telegram

---

## 🐛 Возможные причины

### Причина 1: Функция не получает запросы от Telegram

**Признаки:**
- Логи пустые
- Таблицы БД пустые
- `pending_update_count` = 0

**Решение:**
1. Проверить, что webhook действительно установлен (уже проверено ✅)
2. Проверить, что URL функции доступен извне
3. Попробовать отправить тестовый POST запрос к функции

**Тест доступности:**
```powershell
$body = @{
  update_id = 123456789
  message = @{
    message_id = 1
    from = @{
      id = 123456
      is_bot = $false
      first_name = "Test"
    }
    chat = @{
      id = 123456
      type = "private"
    }
    date = 1730048280
    text = "/start"
  }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "https://icnnwmjrprufrohiyfpm.supabase.co/functions/v1/telegram-webhook" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

### Причина 2: Функция падает с ошибкой

**Признаки:**
- В логах видны ошибки
- Возможно, проблема с API ключами
- Возможно, проблема с доступом к БД

**Решение:**
1. Проверить логи на конкретные ошибки
2. Проверить валидность API ключей:
   - Gemini API Key: https://aistudio.google.com/app/apikey
   - Google Maps API Key: https://console.cloud.google.com/apis/credentials
3. Проверить, что у Service Role Key есть права на таблицы

### Причина 3: Функция работает, но не отправляет ответы

**Признаки:**
- Логи показывают "Received update"
- Данные записываются в БД
- Но пользователь не получает ответов

**Решение:**
1. Проверить, что `TELEGRAM_BOT_TOKEN` правильный
2. Проверить код отправки сообщений в `telegram-client.ts`
3. Проверить логи на ошибки от Telegram API

### Причина 4: JWT Authentication

**Признаки:**
- Функция возвращает 401 Unauthorized
- (Это было в начале, но мы удалили webhook и пересоздали)

**Решение:**
1. Проверить настройки функции в Dashboard
2. Убедиться, что JWT verification отключен для webhook
3. Переразвернуть функцию с флагом `--no-verify-jwt`:

```powershell
npx supabase functions deploy telegram-webhook --no-verify-jwt
```

---

## 📝 План действий (в порядке приоритета)

1. **Проверить логи Edge Function** (самое важное!)
   - https://supabase.com/dashboard/project/icnnwmjrprufrohiyfpm/logs/edge-logs
   - Если пусто → функция не вызывается
   - Если есть ошибки → смотрим конкретную ошибку

2. **Проверить базу данных**
   - Запустить SQL запросы выше
   - Если есть данные → функция работает частично
   - Если пусто → функция не работает

3. **Вызвать функцию вручную**
   - Через Dashboard → Invoke
   - Или через PowerShell (скрипт выше)
   - Смотрим на ответ и логи

4. **Переразвернуть функцию с --no-verify-jwt**
   - Если все остальное не помогло
   - Возможно, проблема с JWT authentication

---

## 🆘 Быстрая помощь

**Если нужно быстро исправить:**

1. Откройте логи: https://supabase.com/dashboard/project/icnnwmjrprufrohiyfpm/logs/edge-logs
2. Найдите ошибку
3. Исправьте код
4. Переразверните:
   ```powershell
   npx supabase functions deploy telegram-webhook
   ```

**Если проблема с JWT:**

```powershell
npx supabase functions deploy telegram-webhook --no-verify-jwt
```

**Если нужно сбросить webhook:**

```powershell
$TOKEN = "8293206567:AAHhTdSzqSfdPCjIsSSQT0AbakebTZ_lX4c"
Invoke-RestMethod -Uri "https://api.telegram.org/bot$TOKEN/deleteWebhook" -Method Post -ContentType "application/json" -Body '{"drop_pending_updates":true}'
Invoke-RestMethod -Uri "https://api.telegram.org/bot$TOKEN/setWebhook" -Method Post -ContentType "application/json" -Body (@{url="https://icnnwmjrprufrohiyfpm.supabase.co/functions/v1/telegram-webhook"; allowed_updates=@("message", "callback_query")} | ConvertTo-Json)
```

---

**Следующий шаг:** Откройте логи Edge Function и проверьте, что там. Это даст нам ответ на вопрос, почему бот не отвечает.

