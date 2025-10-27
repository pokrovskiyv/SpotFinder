# ⚡ Применить миграции СЕЙЧАС

## Статус: Готово к применению ✅

Все подготовительные работы завершены. Осталось только применить миграции через веб-интерфейс.

---

## 🎯 Действие: 3 простых шага

### 1. Откройте SQL Editor

👉 **https://app.supabase.com/project/icnnwmjrprufrohiyfpm/sql/new**

*(Прямая ссылка на SQL Editor вашего проекта)*

### 2. Выполните SQL-запросы

Откройте файл **[APPLY_MIGRATIONS_INSTRUCTIONS.md](./APPLY_MIGRATIONS_INSTRUCTIONS.md)** и:

- Скопируйте SQL из **Миграции 1**
- Вставьте в SQL Editor
- Нажмите **"Run"** (или `Ctrl+Enter`)
- Повторите для миграций 2, 3, 4, 5, 6

**Каждая миграция занимает 30 секунд.**

### 3. Проверьте результат

Вернитесь в терминал и запустите:

```powershell
.\verify-migrations.ps1
```

Ожидаемый результат:
```
[OK] Table 'users' exists
[OK] Table 'sessions' exists
[OK] Table 'user_preferences' exists
[OK] Table 'search_history' exists
[OK] Table 'places_cache' exists

SUCCESS! All tables have been created!
```

---

## 📋 Что будет создано

### 5 таблиц:
1. **users** - пользователи Telegram (user_id, first_name)
2. **sessions** - текущие диалоги (location, last_query)
3. **user_preferences** - настройки (home/work, dietary restrictions)
4. **search_history** - история поисков (для аналитики)
5. **places_cache** - кэш Google Places (оптимизация API)

### + PostGIS
Расширение для работы с геолокациями

---

## ⏱️ Время выполнения: 5-10 минут

---

## ❓ FAQ

**Q: Почему не автоматически?**  
A: Supabase REST API не поддерживает выполнение произвольного SQL. Dashboard - стандартный способ.

**Q: Что если я ошибусь?**  
A: Все миграции используют `CREATE TABLE IF NOT EXISTS` - безопасно запускать повторно.

**Q: Можно ли откатить?**  
A: Да, инструкция по откату есть в `APPLY_MIGRATIONS_INSTRUCTIONS.md`

---

## 🔗 Полезные ссылки

- **📖 Полная инструкция**: [APPLY_MIGRATIONS_INSTRUCTIONS.md](./APPLY_MIGRATIONS_INSTRUCTIONS.md)
- **📊 Текущий статус**: [MIGRATION_STATUS.md](./MIGRATION_STATUS.md)  
- **🚀 Быстрый старт**: [QUICKSTART_MIGRATIONS.md](./QUICKSTART_MIGRATIONS.md)
- **✅ Скрипт проверки**: `verify-migrations.ps1`

---

## ✨ После применения миграций

База данных будет полностью готова, и вы сможете:
- ✅ Развернуть Edge Functions
- ✅ Настроить Telegram webhook
- ✅ Запустить бота
- ✅ Начать тестирование

**Удачи! 🚀**

