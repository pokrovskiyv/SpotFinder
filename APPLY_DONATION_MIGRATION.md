# Инструкция по применению миграции для донатов

## Шаг 1: Применить миграцию базы данных

### Вариант A: Через Supabase Dashboard

1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Перейдите в ваш проект
3. Откройте **SQL Editor**
4. Создайте новый запрос
5. Скопируйте и вставьте содержимое файла `supabase/migrations/007_create_donations_table.sql`
6. Нажмите **Run**

### Вариант B: Через Supabase CLI (если установлен)

```bash
cd c:\Projects\SpotFinder
supabase db push
```

## Шаг 2: Настроить команды бота

Обновите команды бота, чтобы добавить `/donate`:

```bash
# В PowerShell
$env:TELEGRAM_BOT_TOKEN="YOUR_BOT_TOKEN"
bash scripts/setup-telegram-commands.sh
```

Или вручную через curl:

```powershell
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setMyCommands" `
  -H "Content-Type: application/json" `
  -d '{
    "commands": [
      {"command": "start", "description": "Начать работу с ботом"},
      {"command": "help", "description": "Справка по использованию"},
      {"command": "location", "description": "Обновить геолокацию"},
      {"command": "donate", "description": "Поддержать бота"}
    ]
  }'
```

## Шаг 3: Задеплоить функцию

Обновите вебхук бота:

```bash
# В PowerShell
supabase functions deploy telegram-webhook
```

Или через Supabase Dashboard:
1. Откройте **Functions** в боковом меню
2. Выберите `telegram-webhook`
3. Нажмите **Deploy**

## Проверка

После применения миграции:

1. Убедитесь, что таблица `donations` создана:
   - Откройте **Table Editor** в Supabase Dashboard
   - Проверьте наличие таблицы `donations`

2. Проверьте команды бота:
   - Откройте ваш бот в Telegram
   - Нажмите "/" чтобы увидеть доступные команды
   - Убедитесь, что есть команда `/donate`

3. Протестируйте функционал:
   - Отправьте `/donate` боту
   - Выберите сумму из кнопок
   - Проверьте оплату (для теста можно использовать минимальную сумму)

## Важно!

Telegram Stars работает БЕЗ дополнительной настройки в BotFather:
- Provider token остается пустым `""`
- Валюту: `"XTR"`
- Минимальная сумма: 1 Star
- Максимальная сумма: 2500 Stars

## Вывод средств

Stars накапливаются автоматически на счету бота. Для вывода:

1. Перейдите на [Fragment.com](https://fragment.com)
2. Войдите через Telegram
3. Привяжите способ вывода (карта или криптокошелек)
4. Выведите средства (минимально ~1000 Stars)

Комиссия Telegram: ~30% от каждой транзакции

