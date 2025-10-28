# Быстрое исправление Webhook

## Проблема
После развертывания функции бот отвечает ошибкой 401, потому что webhook настроен на неправильный URL.

## Причина
❌ **Неправильный URL:** `https://PROJECT_ID.functions.supabase.co/telegram-webhook`  
✅ **Правильный URL:** `https://PROJECT_ID.supabase.co/functions/v1/telegram-webhook`

---

## Быстрое решение

### Вариант 1: Автоматический скрипт (Рекомендуется)

```powershell
# 1. Установите токен бота
$env:TELEGRAM_BOT_TOKEN = "ВАШ_ТОКЕН_БОТА"

# 2. Запустите скрипт
.\Docs\scripts\setup-webhook-auto.ps1
```

### Вариант 2: Развертывание + Webhook автоматически

```powershell
# Установите токен один раз
$env:TELEGRAM_BOT_TOKEN = "ВАШ_ТОКЕН_БОТА"

# Развертывание с автоматической настройкой webhook
.\Docs\scripts\redeploy-function.ps1
```

---

## Автоматизация на будущее

### Настройте переменную окружения постоянно

Добавьте в ваш PowerShell профиль:

```powershell
# Откройте профиль
notepad $PROFILE

# Добавьте строку:
$env:TELEGRAM_BOT_TOKEN = "ВАШ_ТОКЕН_БОТА"
```

Теперь при каждом развертывании webhook будет настраиваться автоматически:

```powershell
.\Docs\scripts\redeploy-function.ps1
```

---

## Проверка статуса webhook

```powershell
# Вручную
$token = "ВАШ_ТОКЕН"
Invoke-RestMethod "https://api.telegram.org/bot$token/getWebhookInfo" | ConvertTo-Json -Depth 5

# Или через скрипт
.\Docs\scripts\setup-webhook-auto.ps1 -BotToken "ВАШ_ТОКЕН"
```

---

## Что должно быть в результате

```json
{
  "ok": true,
  "result": {
    "url": "https://icnnwmjrprufrohiyfpm.supabase.co/functions/v1/telegram-webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "max_connections": 40
  }
}
```

✅ **URL правильный** если содержит `/functions/v1/`

---

## Тестирование

После настройки webhook отправьте боту:

```
Промочил ноги
```

**Ожидаемый результат:** Бот предлагает обувные магазины, НЕ отели! 👞

