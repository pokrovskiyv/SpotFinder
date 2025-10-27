# 🔴 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Бот не работает - пошаговая инструкция

## ✅ Текущая ситуация

- Миграция БД применена ✅
- Функция задеплоена ✅
- **Бот возвращает 401 Unauthorized** ❌

**Причина:** Отсутствуют environment variables в Supabase Functions

---

## 📋 Пошаговая инструкция (5 минут)

### Шаг 1: Установить Environment Variables

**Откройте в браузере:**
```
https://app.supabase.com/project/icnnwmjrprufrohiyfpm/settings/functions
```

**В разделе "Secrets" или "Environment Variables" добавьте:**

| Name | Value |
|------|-------|
| `TELEGRAM_BOT_TOKEN` | `8293206567:AAHhTdSzqSfdPCjIsSSQT0AbakebTZ_lX4c` |
| `GEMINI_API_KEY` | `AIzaSyBHQQrZ4qkbgcFlmZ5JhPZMJ2sr_7N6HsQ` |
| `GOOGLE_MAPS_API_KEY` | `AIzaSyDAP7MoXSnByka1ogItyCWoPmrq93CRF5g` |
| `SUPABASE_URL` | `https://icnnwmjrprufrohiyfpm.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imljbm53bWpycHJ1ZnJvaGl5ZnBtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU3ODI4NSwiZXhwIjoyMDc3MTU0Mjg1fQ.IfQ3P_k0yGQhN38dyu4IrY3WGuN-77nIecBECT-jIFc` |

**⚠️ ВАЖНО:** После добавления каждой переменной нажимайте **Save**

---

### Шаг 2: Redeploy функцию

**Вариант A: Через Dashboard (рекомендуется)**

1. Откройте: https://app.supabase.com/project/icnnwmjrprufrohiyfpm/functions/telegram-webhook
2. Нажмите кнопку **Redeploy** или **Deploy**

**Вариант B: Через CLI**

Выполните в терминале:
```powershell
.\redeploy-function.ps1
```

---

### Шаг 3: Установить Webhook

**Откройте в браузере:**
```
https://api.telegram.org/bot8293206567:AAHhTdSzqSfdPCjIsSSQT0AbakebTZ_lX4c/setWebhook?url=https://icnnwmjrprufrohiyfpm.supabase.co/functions/v1/telegram-webhook
```

Должен вернуться JSON:
```json
{"ok": true, "result": true, "description": "Webhook was set"}
```

---

### Шаг 4: Проверить результат

Выполните в терминале:
```powershell
.\verify-fix.ps1
```

Или откройте в браузере:
```
https://api.telegram.org/bot8293206567:AAHhTdSzqSfdPCjIsSSQT0AbakebTZ_lX4c/getWebhookInfo
```

**Проверьте:**
- ✅ `"ok": true`
- ✅ НЕ должно быть `"last_error_message"` с 401/500
- ✅ `"pending_update_count"` уменьшается

---

### Шаг 5: Тестирование

**Отправьте боту в Telegram:**
1. `/start` - должно прийти приветственное сообщение
2. `/help` - справка по командам
3. `/donate` - кнопки для доната

---

## 🔍 Диагностика

**Если бот всё ещё не отвечает:**

1. Проверьте логи функции:
   - https://app.supabase.com/project/icnnwmjrprufrohiyfpm/functions/telegram-webhook
   - Вкладка **Logs** → посмотрите ошибки

2. Проверьте, что ВСЕ переменные установлены:
   ```powershell
   .\verify-fix.ps1
   ```

3. Пересоздайте webhook:
   - Удалите: https://api.telegram.org/bot8293206567:AAHhTdSzqSfdPCjIsSSQT0AbakebTZ_lX4c/deleteWebhook
   - Создайте заново (Шаг 3)

---

## ⚡ Быстрый старт (всё в одном)

Откройте в PowerShell и выполните:

```powershell
# 1. Проверка текущего состояния
.\check-webhook-status.ps1

# 2. Инструкция по установке переменных
.\set-environment-variables.ps1

# После установки переменных в Dashboard:

# 3. Redeploy
.\redeploy-function.ps1

# 4. Проверка результата
.\verify-fix.ps1
```

---

## 📝 Примечания

- **Критично:** После изменения любых секретов **ОБЯЗАТЕЛЬНО** делайте redeploy
- Supabase подхватывает новые переменные только после redeploy
- Webhook нужно устанавливать только один раз (если URL не меняется)
- Supabase CLI **блокирует** переменные с префиксом `SUPABASE_*` - их нужно добавить через Dashboard

