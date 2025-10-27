# Ручной деплой функции telegram-webhook

## Проблема

Ошибка `Entrypoint path does not exist` возникает, когда Supabase Dashboard пытается задеплоить функцию из неправильного пути.

## Решение: Деплой через Supabase Dashboard

### Шаг 1: Подготовка файлов

Все необходимые файлы уже есть в проекте:
- `supabase/functions/telegram-webhook/index.ts` - главный файл
- `supabase/functions/_shared/` - общие модули

### Шаг 2: Деплой через Dashboard

1. Откройте: https://app.supabase.com/project/icnnwmjrprufrohiyfpm
2. Перейдите в **Edge Functions** (в левом меню)
3. Найдите функцию `telegram-webhook`
4. Если функция не существует - нажмите **Create a new function**
5. Если функция существует:
   - Нажмите на неё
   - Нажмите **Deploy new version**

### Шаг 3: Настройка Environment Variables

Убедитесь, что установлены следующие переменные окружения (в настройках функции):

```
TELEGRAM_BOT_TOKEN=8293206567:AAHhTdSzqSfdPCjIsSSQT0AbakebTZ_lX4c
GEMINI_API_KEY=<ваш_ключ>
GOOGLE_MAPS_API_KEY=<ваш_ключ>
SUPABASE_URL=https://icnnwmjrprufrohiyfpm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<ваш_service_role_key>
```

### Альтернатива: Деплой через Supabase CLI (рекомендуется)

Если установлен Supabase CLI:

```bash
# Установка через Chocolatey (Windows)
choco install supabase

# Или через Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Деплой функции
cd c:\Projects\SpotFinder
supabase functions deploy telegram-webhook
```

## Если функции ещё нет

Создайте её через Dashboard:
1. Functions → Create a new function
2. Name: `telegram-webhook`
3. Загрузите код из `supabase/functions/telegram-webhook/index.ts`
4. Настройте environment variables
5. Deploy

## После деплоя

Проверьте URL функции:
```
https://icnnwmjrprufrohiyfpm.supabase.co/functions/v1/telegram-webhook
```

Обновите webhook бота (если нужно):
```powershell
$TOKEN = "8293206567:AAHhTdSzqSfdPCjIsSSQT0AbakebTZ_lX4c"
$WEBHOOK = "https://icnnwmjrprufrohiyfpm.supabase.co/functions/v1/telegram-webhook"

Invoke-RestMethod -Uri "https://api.telegram.org/bot$TOKEN/setWebhook" `
  -Method Post `
  -ContentType "application/json" `
  -Body "{`"url`": `"$WEBHOOK`"}"
```

## Текущий статус

- ✅ Команда `/donate` добавлена в меню бота
- ⏳ Миграция БД (нужно применить через SQL Editor)
- ⏳ Деплой функции (следуйте инструкциям выше)

## Быстрая проверка

После деплоя:
1. Откройте бота в Telegram
2. Отправьте `/donate`
3. Должны появиться кнопки с суммами

