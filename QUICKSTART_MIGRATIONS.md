# 🚀 Быстрый старт: Применение миграций

## Что делать прямо сейчас

### 1️⃣ Откройте Supabase Dashboard

👉 https://app.supabase.com → Проект **SpotFinder** (`icnnwmjrprufrohiyfpm`)

### 2️⃣ Перейдите в SQL Editor

В левом меню: **SQL Editor** → **New query**

### 3️⃣ Скопируйте и выполните SQL

Откройте файл **`APPLY_MIGRATIONS_INSTRUCTIONS.md`** и выполните все 6 SQL-запросов по порядку.

**Важно:** Применяйте миграции **строго по порядку** (001 → 002 → 003 → 004 → 005 → 006)

### 4️⃣ Проверьте результат

Запустите скрипт проверки:

```powershell
.\verify-migrations.ps1
```

Должно показать: ✅ **SUCCESS! All tables have been created!**

---

## ⏱️ Это займёт 5-10 минут

Каждая миграция - это просто копирование SQL-кода и нажатие кнопки "Run".

## ❓ Нужна помощь?

- **Полная инструкция**: `APPLY_MIGRATIONS_INSTRUCTIONS.md`
- **Текущий статус**: `MIGRATION_STATUS.md`
- **Руководство**: `supabase/MIGRATIONS_GUIDE.md`

---

## ✅ После применения миграций

База данных будет готова к работе со следующими таблицами:
- 👥 `users` - пользователи Telegram
- 💬 `sessions` - контекст диалогов
- ⚙️ `user_preferences` - персонализация
- 📊 `search_history` - аналитика
- 🗺️ `places_cache` - кэш мест

