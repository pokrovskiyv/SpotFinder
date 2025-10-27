# 🔴 КРИТИЧЕСКАЯ ПРОБЛЕМА: Бот не работает

## Проблема

Webhook возвращает `401 Unauthorized`:
```
"last_error_message": "Wrong response from the webhook: 401 Unauthorized"
```

**Причина:** Environment variables функции `telegram-webhook` **не установлены**.

## ✅ Решение (3 минуты)

### Шаг 1: Установить Environment Variables

1. Откройте: https://app.supabase.com/project/icnnwmjrprufrohiyfpm/settings/functions

2. Найдите раздел **Secrets** или **Environment Variables**

3. Добавьте следующие переменные:

```
TELEGRAM_BOT_TOKEN = 8293206567:AAHhTdSzqSfdPCjIsSSQT0AbakebTZ_lX4c
GEMINI_API_KEY = AIzaSyBHQQrZ4qkbgcFlmZ5JhPZMJ2sr_7N6HsQ
GOOGLE_MAPS_API_KEY = AIzaSyDAP7MoXSnByka1ogItyCWoPmrq93CRF5g
SUPABASE_URL = https://icnnwmjrprufrohiyfpm.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imljbm53bWpycHJ1ZnJvaGl5ZnBtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU3ODI4NSwiZXhwIjoyMDc3MTU0Mjg1fQ.IfQ3P_k0yGQhN38dyu4IrY3WGuN-77nIecBECT-jIFc
```

4. **Сохраните**

### Шаг 2: Redeploy функцию

- Перейдите: https://app.supabase.com/project/icnnwmjrprufrohiyfpm/functions/telegram-webhook
- Нажмите **Deploy** или **Redeploy**

### Шаг 3: Проверка

Отправьте боту `/start` - должно прийти приветственное сообщение.

---

## Почему это произошло?

Supabase CLI **блокирует** установку переменных с префиксом `SUPABASE_`:
```
Env name cannot start with SUPABASE_, skipping: SUPABASE_URL
Env name cannot start with SUPABASE_, skipping: SUPABASE_SERVICE_ROLE_KEY
```

Эти переменные можно установить только через Dashboard.

---

## Альтернатива: Полная инструкция

Подробно: [DEPLOYMENT.md](./DEPLOYMENT.md) → раздел "Environment Variables"

---

## После исправления

1. ✅ Бот ответит на `/start`
2. ✅ Команда `/donate` будет работать (после применения миграции БД)

**Время: 3 минуты**

