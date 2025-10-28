# Применение упрощённой системы истории

## Быстрое применение

### 1. Применить миграцию БД

**Через Supabase Dashboard:**
1. Перейдите в [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите проект SpotFinder
3. SQL Editor → New Query
4. Скопируйте содержимое `supabase/migrations/010_add_shown_places_history.sql`
5. Выполните запрос

**Или через CLI:**
```bash
cd c:\Projects\SpotFinder
supabase migration up
```

**Содержимое миграции:**
```sql
-- Add fields for place caching and history to sessions table
-- History lives only as long as location is valid (~30 minutes)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS places_cache JSONB NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cache_query TEXT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cache_index INT DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS shown_place_ids TEXT[] NULL;
```

### 2. Переразвернуть Edge Function

```bash
cd c:\Projects\SpotFinder
supabase functions deploy telegram-webhook
```

### 3. Проверить работу

1. **Тест базового поиска:**
   - Отправьте геолокацию боту
   - Выполните поиск: "кафе рядом"
   - Нажмите "Показать ещё" 2-3 раза
   - Убедитесь, что места не повторяются

2. **Тест увеличения радиуса:**
   - После исчерпания кэша (при следующем "Показать ещё")
   - Бот должен показать сообщение: "🔍 Нашёл ещё места в радиусе 10 км!"
   - Проверьте счётчик: "(всего показано: N)"

3. **Тест автосброса истории:**
   - Отправьте новую геолокацию
   - Выполните тот же поиск
   - Места должны появиться снова (история сброшена)

4. **Тест исчерпания мест:**
   - В малонаселённом районе нажимайте "Показать ещё"
   - В конце должно появиться сообщение: 
     ```
     😞 Показал все N мест в радиусе 20 км.
     
     Попробуйте:
     • Другой запрос
     • Обновить локацию
     • Подождать немного (история обновится через X мин)
     ```

## Что изменилось

### Удалено
- ❌ Таблица `user_shown_places`
- ❌ Файл `shown-places-manager.ts`
- ❌ Команда `/clear_history`

### Добавлено
- ✅ Поле `shown_place_ids` в таблице `sessions`
- ✅ Методы в `SessionManager`: `addShownPlaceIds`, `getShownPlaceIds`, `clearShownPlaceIds`
- ✅ Автоматическое увеличение радиуса поиска (5км → 10км → 20км)
- ✅ Метод `getLocationTimeLeft()` для показа времени до сброса

### Изменено
- ⚙️ `updateLocation()` теперь очищает историю автоматически
- ⚙️ `searchNearbyPlaces()` принимает параметр `radius`
- ⚙️ Обработчик "Показать ещё" работает с увеличенным радиусом

## Преимущества

1. **Проще** - нет отдельной таблицы БД
2. **Быстрее** - меньше запросов к БД
3. **Автоматичнее** - история сбрасывается сама
4. **Информативнее** - показывается радиус поиска и счётчик мест
5. **Удобнее** - автоматическое расширение радиуса поиска

## Обратная совместимость

- ✅ Существующие сессии работают без изменений
- ✅ Новое поле `shown_place_ids` создаётся со значением `NULL`
- ✅ Если раньше существовала таблица `user_shown_places`, её можно безопасно удалить

## Удаление старой таблицы (опционально)

Если в вашей БД была создана таблица `user_shown_places`, можете её удалить:

```sql
DROP TABLE IF EXISTS user_shown_places CASCADE;
```

## Troubleshooting

### Ошибка: column "shown_place_ids" does not exist
**Решение:** Миграция не применена. Выполните шаг 1.

### Ошибка при деплое функции
**Решение:** 
```bash
# Проверьте статус
supabase functions list

# Попробуйте снова
supabase functions deploy telegram-webhook --no-verify-jwt
```

### Бот не показывает новые места
**Решение:**
1. Обновите локацию
2. Проверьте логи: `supabase functions logs telegram-webhook`
3. Убедитесь, что миграция применена

## Полная документация

См. [SIMPLIFIED_HISTORY_CHANGELOG.md](../SIMPLIFIED_HISTORY_CHANGELOG.md) для подробной технической информации.

