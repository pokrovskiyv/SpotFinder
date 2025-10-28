# Правильная настройка Telegram Webhook

## 🚨 КРИТИЧЕСКИ ВАЖНО: Используйте правильный URL!

### ❌ НЕПРАВИЛЬНО:
```
https://PROJECT_ID.supabase.co/functions/v1/telegram-webhook
```
**Проблема:** Этот URL требует JWT токен авторизации, что вызывает **401 ошибки**!

### ✅ ПРАВИЛЬНО:
```
https://PROJECT_ID.functions.supabase.co/telegram-webhook
```
**Решение:** Этот URL публичный и не требует авторизации.

---

## Почему это происходит?

Supabase предоставляет **два типа URL** для Edge Functions:

### 1. URL с авторизацией (для клиентских запросов)
```
https://{project}.supabase.co/functions/v1/{function}
```
- Требует JWT токен в заголовке `Authorization`
- Используется для вызовов из браузера/мобильных приложений
- **НЕ подходит для webhook**, так как Telegram не может отправить JWT

### 2. Публичный URL (для webhook и внешних сервисов)
```
https://{project}.functions.supabase.co/{function}
```
- Не требует авторизации
- Специально для webhook и публичных API
- **ИСПОЛЬЗУЙТЕ ЭТОТ ФОРМАТ для Telegram webhook**

### Настройка verify_jwt

Файл `config.json` с параметром `verify_jwt: false` работает только для второго формата URL!

---

## Автоматическая настройка (Рекомендуется)

### Шаг 1: Установите переменные окружения

**Windows PowerShell:**
```powershell
$env:TELEGRAM_BOT_TOKEN = "your_bot_token"
$env:SUPABASE_PROJECT_ID = "your_project_id"
```

**Linux/macOS:**
```bash
export TELEGRAM_BOT_TOKEN="your_bot_token"
export SUPABASE_PROJECT_ID="your_project_id"
```

### Шаг 2: Запустите скрипт автоматической настройки

```bash
deno run --allow-env --allow-net scripts/setup-webhook.ts
```

Скрипт автоматически:
- ✅ Сгенерирует правильный URL формат
- ✅ Установит webhook в Telegram
- ✅ Проверит статус и выявит ошибки
- ✅ Покажет детальную информацию

### Ожидаемый вывод:

```
═══════════════════════════════════════════════════════
  Telegram Webhook Setup Script
═══════════════════════════════════════════════════════

🔧 Setting up Telegram webhook...
📍 Environment: production
📍 URL: https://your-project.functions.supabase.co/telegram-webhook

✅ Webhook successfully set!

🔍 Checking webhook status...

📊 Webhook Info:
   URL: https://your-project.functions.supabase.co/telegram-webhook
   Has custom certificate: false
   Pending update count: 0
   Max connections: 40
   ✅ No errors

✅ URL format is correct! (.functions.supabase.co)

═══════════════════════════════════════════════════════
✅ Setup completed successfully!
═══════════════════════════════════════════════════════
```

---

## Ручная настройка

Если вы предпочитаете настроить вручную:

### Шаг 1: Установите webhook

**Windows PowerShell:**
```powershell
$TOKEN = "your_telegram_bot_token"
$PROJECT_ID = "your_supabase_project_id"

Invoke-RestMethod -Uri "https://api.telegram.org/bot$TOKEN/setWebhook" `
  -Method Post `
  -ContentType "application/json" `
  -Body (ConvertTo-Json @{
    url = "https://$PROJECT_ID.functions.supabase.co/telegram-webhook"
    allowed_updates = @("message", "callback_query", "pre_checkout_query")
  })
```

**Linux/macOS/Git Bash:**
```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://${SUPABASE_PROJECT_ID}.functions.supabase.co/telegram-webhook\",
    \"allowed_updates\": [\"message\", \"callback_query\", \"pre_checkout_query\"]
  }"
```

### Шаг 2: Проверьте статус

```bash
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

### Ожидаемый ответ:

```json
{
  "ok": true,
  "result": {
    "url": "https://your-project.functions.supabase.co/telegram-webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "max_connections": 40
  }
}
```

---

## Проверка и тестирование

### 1. Проверьте правильность URL

Убедитесь, что URL содержит `.functions.supabase.co`:

```bash
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo" | grep "functions.supabase.co"
```

### 2. Тест бота

Отправьте сообщение боту в Telegram:
- Напишите `/start`
- Отправьте любое сообщение
- Проверьте, что бот отвечает

### 3. Проверьте логи Supabase

1. Откройте Supabase Dashboard
2. Edge Functions → telegram-webhook → Logs
3. Убедитесь, что нет 401 ошибок

---

## Решение проблем

### Ошибка 401: Unauthorized

**Причина:** Используется неправильный URL формат

**Решение:**
1. Проверьте текущий webhook:
   ```bash
   curl "https://api.telegram.org/bot${TOKEN}/getWebhookInfo"
   ```

2. Если URL содержит `.supabase.co/functions/v1/` - исправьте:
   ```bash
   deno run --allow-env --allow-net scripts/setup-webhook.ts
   ```

### Webhook не получает обновления

**Проверьте:**
1. ✅ URL правильный формат?
2. ✅ Функция задеплоена?
3. ✅ config.json содержит `"verify_jwt": false`?
4. ✅ Secrets установлены в Supabase?

**Проверка secrets:**
```bash
supabase secrets list
```

### Last error в webhook info

Если видите `last_error_message` в выводе:

```json
{
  "last_error_message": "Wrong response from the webhook: 401 Unauthorized",
  "last_error_date": 1234567890
}
```

**Это точно неправильный URL формат!** Запустите скрипт настройки заново.

---

## CI/CD интеграция

Добавьте автоматическую настройку webhook в GitHub Actions:

```yaml
- name: Setup Telegram Webhook
  run: |
    deno run --allow-env --allow-net scripts/setup-webhook.ts
  env:
    TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
    SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
```

---

## Дополнительные ресурсы

- [Supabase Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Telegram Bot API: setWebhook](https://core.telegram.org/bots/api#setwebhook)
- [Telegram Bot API: getWebhookInfo](https://core.telegram.org/bots/api#getwebhookinfo)

---

## Контрольный чек-лист

Перед развертыванием убедитесь:

- [ ] URL использует формат `.functions.supabase.co`
- [ ] `config.json` содержит `"verify_jwt": false`
- [ ] Все secrets установлены в Supabase
- [ ] Функция успешно задеплоена
- [ ] Webhook установлен через скрипт или вручную
- [ ] Webhook Info не показывает ошибок
- [ ] Бот отвечает на тестовые сообщения
- [ ] Логи не содержат 401 ошибок

**После выполнения всех пунктов - ваш бот работает корректно!** ✅

