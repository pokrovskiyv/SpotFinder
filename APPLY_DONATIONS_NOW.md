# 🎯 Применение функционала донатов - пошаговая инструкция

## ✅ Что уже сделано

Весь код функционала донатов **уже реализован**:
- ✅ Миграция БД (файл готов)
- ✅ DonationManager (код готов)
- ✅ Обновлен Orchestrator (код готов)
- ✅ Telegram Client расширен (код готов)
- ✅ Типы добавлены (код готов)
- ✅ Константы добавлены (код готов)
- ✅ Кнопки созданы (код готов)
- ✅ Скрипт команд обновлен (код готов)
- ✅ Документация создана (файлы готовы)

---

## 📋 Что НУЖНО сделать ВАМ (3 шага)

### ⚡ ШАГ 1: Применить миграцию БД (2 минуты)

#### Способ A: Через Supabase Dashboard (рекомендуется)

1. Откройте: https://app.supabase.com
2. Выберите ваш проект
3. Перейдите в **SQL Editor** (слева в меню)
4. Нажмите **New query**
5. Откройте файл: `supabase/migrations/007_create_donations_table.sql`
6. Скопируйте **весь** SQL код из файла
7. Вставьте в SQL Editor
8. Нажмите **Run** (или `Ctrl+Enter`)

**Проверка:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'donations';
```

Должна вернуться строка с `donations`.

---

### 📱 ШАГ 2: Обновить команды бота (1 минута)

#### Способ A: Через скрипт (требуется токен)

```bash
# В Git Bash или WSL
cd c:\Projects\SpotFinder
export TELEGRAM_BOT_TOKEN="YOUR_BOT_TOKEN"
bash scripts/setup-telegram-commands.sh
```

#### Способ B: Через curl в PowerShell

```powershell
$TOKEN = "YOUR_BOT_TOKEN"

Invoke-RestMethod -Uri "https://api.telegram.org/bot$TOKEN/setMyCommands" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{
    "commands": [
      {"command": "start", "description": "Начать работу с ботом"},
      {"command": "help", "description": "Справка по использованию"},
      {"command": "location", "description": "Обновить геолокацию"},
      {"command": "donate", "description": "Поддержать бота"}
    ]
  }'
```

**Проверка:**
Откройте бота в Telegram → нажмите "/" → должна появиться команда `/donate`

---

### 🚀 ШАГ 3: Редeплойте функцию (1 минута)

#### Через Supabase Dashboard:

1. Откройте Supabase Dashboard
2. В боковом меню выберите **Functions**
3. Найдите функцию `telegram-webhook`
4. Нажмите **Deploy** (или **Redeploy**)

ИЛИ

#### Через Supabase CLI (если установлен):

```bash
supabase functions deploy telegram-webhook
```

---

## ✅ Проверка функционала

После выполнения всех шагов:

1. Откройте бота в Telegram
2. Отправьте `/donate`
3. **Ожидание:** Появятся кнопки с суммами донатов (50, 100, 500 Stars)
4. Нажмите любую кнопку
5. **Ожидание:** Telegram покажет окно оплаты
6. Подтвердите платеж
7. **Ожидание:** Придет благодарственное сообщение

---

## 📊 Что было реализовано

### Новые файлы:
- ✅ `supabase/migrations/007_create_donations_table.sql` - миграция БД
- ✅ `supabase/functions/_shared/donation-manager.ts` - менеджер донатов
- ✅ `Docs/Donations.md` - документация
- ✅ `APPLY_DONATION_MIGRATION.md` - инструкция
- ✅ `QUICK_APPLY_DONATION_MIGRATION.md` - быстрая инструкция
- ✅ `SHOW_MIGRATION_SQL.md` - готовый SQL
- ✅ `APPLY_DONATIONS_NOW.md` - этот файл

### Измененные файлы:
- ✅ `supabase/functions/_shared/types.ts` - добавлены типы платежей
- ✅ `supabase/functions/_shared/orchestrator.ts` - обработка донатов
- ✅ `supabase/functions/_shared/telegram-client.ts` - методы инвойсов
- ✅ `supabase/functions/_shared/constants.ts` - константы донатов
- ✅ `supabase/functions/_shared/telegram-formatter.ts` - кнопки донатов
- ✅ `scripts/setup-telegram-commands.sh` - команда /donate
- ✅ `NEXT_STEPS.md` - обновлено количество таблиц

### Функционал:
- ✅ Команда `/donate`
- ✅ Кнопки с фиксированными суммами (50, 100, 500 Stars)
- ✅ Обработка платежей через Telegram Stars (XTR)
- ✅ Сохранение донатов в БД
- ✅ Благодарственные сообщения с общей суммой
- ✅ Защита от дубликатов платежей
- ✅ Валидация сумм (1-2500 Stars)

---

## ⚡ Быстрый старт

Если нужно применить миграцию прямо сейчас:

1. Откройте: https://app.supabase.com → ваш проект → SQL Editor
2. Откройте файл: `supabase/migrations/007_create_donations_table.sql`
3. Скопируйте весь SQL и выполните
4. Обновите команды (см. Шаг 2 выше)
5. Редeплойте функцию (см. Шаг 3 выше)
6. Протестируйте `/donate`

---

## 📚 Документация

- [Docs/Donations.md](./Docs/Donations.md) - Детальное описание функционала
- [APPLY_DONATION_MIGRATION.md](./APPLY_DONATION_MIGRATION.md) - Полная инструкция
- [QUICK_APPLY_DONATION_MIGRATION.md](./QUICK_APPLY_DONATION_MIGRATION.md) - Краткая инструкция
- [SHOW_MIGRATION_SQL.md](./SHOW_MIGRATION_SQL.md) - Готовый SQL код

---

## 🎉 Всё готово!

Функционал донатов полностью реализован. Осталось только применить изменения (3 шага выше).

**Время выполнения:** ~5 минут

**Удачи! 🚀**

