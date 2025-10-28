# ✅ Чек-лист развертывания системы аналитики

## 📋 Проверка готовности кода

- [x] Миграция 005 обновлена (results_count, top_result)
- [x] Миграция 008 создана (user_actions таблица)
- [x] PlaceCacheManager реализован
- [x] UserActionTracker реализован
- [x] GeminiClient интегрирован с кэшем
- [x] Orchestrator интегрирован с трекингом
- [x] SessionManager исправлен
- [x] Types обновлены
- [x] Тесты созданы
- [x] Документация готова

## 🚀 Шаги развертывания

### 1. Применить миграции базы данных

**В Supabase Dashboard → SQL Editor выполните:**

```sql
-- Шаг 1.1: Обновить search_history
ALTER TABLE search_history 
ADD COLUMN IF NOT EXISTS results_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS top_result JSONB NULL;

-- Шаг 1.2: Создать user_actions (выполнить весь файл 008_create_user_actions_table.sql)
-- Скопируйте содержимое из supabase/migrations/008_create_user_actions_table.sql
```

### 2. Проверить применение миграций

```sql
-- Проверить search_history
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'search_history'
ORDER BY ordinal_position;

-- Проверить user_actions
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_actions'
ORDER BY ordinal_position;
```

Ожидаемый результат:
- search_history должна содержать: `results_count`, `top_result`
- user_actions должна существовать со всеми полями

### 3. Обновить Edge Functions

**Вариант A: Через GitHub (если настроен автоматический деплой)**
```bash
git add .
git commit -m "feat: add analytics and caching system"
git push origin main
```

**Вариант B: Через Dashboard UI**
1. Edge Functions → telegram-webhook
2. Обновить все файлы из `supabase/functions/telegram-webhook/`
3. Обновить все файлы из `supabase/functions/_shared/`
4. Deploy

**Вариант C: Через Supabase CLI (после установки)**
```powershell
# Установить CLI
npm install -g supabase

# Развернуть
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy telegram-webhook
```

### 4. Проверить работу в боте

1. Отправьте боту любой поисковый запрос
2. Просмотрите отзывы места
3. Выберите место
4. Постройте маршрут (если доступно)

### 5. Проверить запись данных

```sql
-- Проверить историю поиска
SELECT 
    search_id,
    query_text,
    results_count,
    top_result->>'name' as top_place,
    timestamp
FROM search_history
ORDER BY timestamp DESC
LIMIT 5;

-- Проверить действия пользователей
SELECT 
    action_id,
    user_id,
    action_type,
    place_id,
    created_at
FROM user_actions
ORDER BY created_at DESC
LIMIT 10;

-- Статистика по действиям
SELECT 
    action_type,
    COUNT(*) as count
FROM user_actions
GROUP BY action_type
ORDER BY count DESC;
```

### 6. Проверить кэширование

```sql
-- Посмотреть что в кэше
SELECT 
    place_id,
    name,
    last_fetched_at,
    cache_expires_at > NOW() as is_valid
FROM places_cache
ORDER BY last_fetched_at DESC
LIMIT 10;
```

## ⚠️ Возможные проблемы

### Проблема: Таблицы не создаются
**Решение:** Проверьте права service role key в настройках проекта

### Проблема: Функции не видят новые таблицы
**Решение:** Пересоздайте функцию с параметром --no-verify-jwt

### Проблема: Кэш не работает
**Решение:** Проверьте, что GeminiClient получает supabaseUrl и supabaseKey в конструкторе

### Проблема: История не записывается
**Решение:** Проверьте, что поля results_count и top_result добавлены в таблицу

## ✅ Критерии успешного развертывания

- [ ] Миграции применены без ошибок
- [ ] Таблицы созданы/обновлены корректно
- [ ] Edge Functions обновлены
- [ ] Бот отвечает на запросы
- [ ] search_history записывается с новыми полями
- [ ] user_actions записывается при действиях
- [ ] places_cache заполняется при повторных запросах

## 📊 Мониторинг после развертывания

### Первые 24 часа:
- Проверить размер таблицы user_actions
- Проверить эффективность кэша (количество записей)
- Убедиться, что нет ошибок в логах Edge Functions

### Через неделю:
- Проверить статистику действий
- Проанализировать популярность мест
- Оценить экономию на API запросах

## 🔗 Полезные ссылки

- 📖 [Быстрый старт](Docs/QUICK_DEPLOY_ANALYTICS.md)
- 📊 [Технический отчет](Docs/ANALYTICS_IMPLEMENTATION_REPORT.md)
- 🗃️ [Руководство по миграциям](Docs/DATABASE_MIGRATION_GUIDE.md)
- 📝 [Changelog](CHANGELOG_ANALYTICS.md)

---

**После успешного выполнения всех шагов система аналитики будет полностью работать!** 🎉


