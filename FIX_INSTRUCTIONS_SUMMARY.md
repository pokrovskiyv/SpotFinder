# ✅ Скрипты для исправления бота созданы

## 🎯 Проблема диагностирована

**Текущий статус:**
```
❌ "Wrong response from the webhook: 401 Unauthorized"
❌ 9 pending updates
```

**Причина:** Environment variables не установлены в Supabase Functions

---

## 📂 Созданные скрипты

### 1. `check-webhook-status.ps1`
Проверяет текущий статус webhook и показывает ошибки

### 2. `set-environment-variables.ps1`
Инструкция по установке переменных через Dashboard

### 3. `redeploy-function.ps1`
Redeploy функции после установки переменных

### 4. `install-webhook.ps1`
Установка webhook URL в Telegram

### 5. `verify-fix.ps1`
Проверка результата после исправления

---

## 🚀 Порядок действий

### ШАГ 1: Установить переменные в Dashboard

**Откройте:**
```
https://app.supabase.com/project/icnnwmjrprufrohiyfpm/settings/functions
```

**Добавьте 5 переменных:**
```
TELEGRAM_BOT_TOKEN = 8293206567:AAHhTdSzqSfdPCjIsSSQT0AbakebTZ_lX4c
GEMINI_API_KEY = AIzaSyBHQQrZ4qkbgcFlmZ5JhPZMJ2sr_7N6HsQ
GOOGLE_MAPS_API_KEY = AIzaSyDAP7MoXSnByka1ogItyCWoPmrq93CRF5g
SUPABASE_URL = https://icnnwmjrprufrohiyfpm.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imljbm53bWpycHJ1ZnJvaGl5ZnBtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU3ODI4NSwiZXhwIjoyMDc3MTU0Mjg1fQ.IfQ3P_k0yGQhN38dyu4IrY3WGuN-77nIecBECT-jIFc
```

### ШАГ 2: Redeploy функцию

**Выполните:**
```powershell
.\redeploy-function.ps1
```

Или через Dashboard:
- https://app.supabase.com/project/icnnwmjrprufrohiyfpm/functions/telegram-webhook
- Нажмите **Redeploy**

### ШАГ 3: Установить webhook

**Выполните:**
```powershell
.\install-webhook.ps1
```

### ШАГ 4: Проверить результат

**Выполните:**
```powershell
.\verify-fix.ps1
```

**Или откройте в браузере:**
```
https://api.telegram.org/bot8293206567:AAHhTdSzqSfdPCjIsSSQT0AbakebTZ_lX4c/getWebhookInfo
```

---

## ✅ Ожидаемый результат

После выполнения всех шагов:
- ✅ Бот отвечает на `/start`
- ✅ Работает `/help` и `/donate`
- ✅ Нет ошибки 401 в логах
- ✅ `pending_update_count` становится 0

---

## 📖 Подробная инструкция

Откройте файл: **`FIX_BOT_STEP_BY_STEP.md`**

---

## ⚡ Быстрый тест

После выполнения всех шагов отправьте боту:
- `/start`
- `/help`  
- `/donate`

Бот должен ответить на все команды!

