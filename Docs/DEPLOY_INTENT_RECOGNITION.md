# Инструкция по развертыванию: Улучшение распознавания намерений

## Быстрый старт

### 1. Проверка изменений

Убедитесь, что все файлы обновлены:

```bash
# Проверка новых файлов
ls supabase/functions/_shared/intent-mapper.ts
ls Docs/INTENT_RECOGNITION_TESTING.md
ls Docs/CHANGELOG_INTENT_RECOGNITION.md

# Проверка обновленных файлов
git status
```

### 2. Развертывание на Supabase

**ВАЖНО:** Перед развертыванием установите токен бота:
```powershell
$env:TELEGRAM_BOT_TOKEN = "ВАШ_ТОКЕН_БОТА"
```

**Вариант 1: Автоматическое развертывание (Рекомендуется)**
```powershell
# Разверните функцию И настройте webhook автоматически
.\Docs\scripts\redeploy-function.ps1
```

**Вариант 2: Ручное развертывание**
```powershell
# Разверните функцию
npx supabase@latest functions deploy telegram-webhook

# Настройте webhook вручную
.\Docs\scripts\setup-webhook-auto.ps1
```

**Вариант 3: Только исправить webhook (без развертывания)**
```powershell
.\Docs\scripts\setup-webhook-auto.ps1 -BotToken "ВАШ_ТОКЕН"
```

### 3. Проверка логов

После развертывания откройте логи Supabase Functions:

```bash
supabase functions logs telegram-webhook --follow
```

Или через веб-интерфейс:
```
https://supabase.com/dashboard/project/YOUR_PROJECT_ID/functions
```

### 4. Тестирование

#### Тест 1: "Промочил ноги"
1. Отправьте боту: "Промочил ноги"
2. Проверьте логи - должны увидеть:
   ```
   ✓ Intent mapped: "промочил ноги" → "обувные магазины поблизости, открыто сейчас"
     Intent: need_footwear, Category: shopping
     Exclude types: lodging, hotel, hostel
   ```
3. Результат: Бот должен предложить **обувные магазины**, НЕ отели

#### Тест 2: "Заболел"
1. Отправьте боту: "Заболел"
2. Проверьте логи для распознавания намерения `need_pharmacy`
3. Результат: Бот должен предложить **аптеки**, НЕ рестораны

#### Тест 3: "Сел телефон"
1. Отправьте боту: "Сел телефон"
2. Проверьте логи для распознавания намерения `need_charging`
3. Результат: Бот должен предложить **кафе с розетками**, НЕ отели

### 5. Мониторинг

Следите за следующими метриками:

1. **Процент распознавания** - сколько запросов распознаются через Intent Mapper
2. **Правильность результатов** - соответствие типов мест запросу
3. **Ошибки** - нет ли новых ошибок в логах

## Откат изменений (если что-то пошло не так)

### Вариант 1: Откат через Git

```bash
# Просмотр последних коммитов
git log --oneline -n 5

# Откат к предыдущей версии
git revert HEAD

# Развертывание старой версии
supabase functions deploy telegram-webhook
```

### Вариант 2: Временное отключение Intent Mapper

Если нужно быстро отключить только Intent Mapper, закомментируйте в `orchestrator.ts`:

```typescript
// В методе handleSearchQuery:
// const mappedIntent = intentMapper.mapQuery(query);
// const processedQuery = mappedIntent ? mappedIntent.suggestedQuery : query;
const mappedIntent = null;
const processedQuery = query;
```

Затем разверните снова.

## Расширение паттернов

### Добавление нового паттерна намерения

1. Откройте `supabase/functions/_shared/intent-mapper.ts`
2. Добавьте новый паттерн в массив `INTENT_PATTERNS`:

```typescript
{
  patterns: [
    /ваше\s+регулярное\s+выражение/i,
    /альтернативный\s+вариант/i,
  ],
  intent: 'unique_name',
  suggestedQuery: 'улучшенный запрос для поиска',
  category: 'category_name',
  excludeTypes: ['lodging', 'hotel'], // опционально
  priority: 85, // 1-100
},
```

3. Разверните функцию:
```bash
supabase functions deploy telegram-webhook
```

4. Протестируйте новый паттерн

### Улучшение AI-промптов

1. Откройте `supabase/functions/_shared/prompts/system-prompts.ts`
2. Обновите секцию `INTENT_UNDERSTANDING` с новыми примерами
3. Разверните и протестируйте

## Полезные команды

### Просмотр логов в реальном времени
```bash
supabase functions logs telegram-webhook --follow
```

### Локальное тестирование (если настроено)
```bash
supabase functions serve telegram-webhook
```

### Просмотр всех функций
```bash
supabase functions list
```

## Структура файлов

```
supabase/functions/_shared/
├── intent-mapper.ts           (НОВЫЙ) - Словарь паттернов
├── prompts/
│   └── system-prompts.ts      (ОБНОВЛЕН) - Улучшенные промпты
├── orchestrator.ts            (ОБНОВЛЕН) - Интеграция
├── gemini-client.ts           (ОБНОВЛЕН) - Передача контекста
└── types.ts                   (ОБНОВЛЕН) - Типы

Docs/
├── INTENT_RECOGNITION_TESTING.md     (НОВЫЙ) - Тесты
├── CHANGELOG_INTENT_RECOGNITION.md   (НОВЫЙ) - Changelog
└── DEPLOY_INTENT_RECOGNITION.md      (НОВЫЙ) - Эта инструкция
```

## Troubleshooting

### Проблема: Паттерн не распознается

**Решение:**
1. Проверьте логи - есть ли сообщение "IntentMapper: No pattern matched"?
2. Проверьте регулярное выражение - тестируйте на [regex101.com](https://regex101.com)
3. Убедитесь, что флаг `/i` установлен для регистронезависимого поиска
4. Проверьте приоритет паттерна - возможно, другой паттерн срабатывает раньше

### Проблема: Бот всё равно предлагает неправильные места

**Решение:**
1. Убедитесь, что `excludeTypes` правильно настроен в паттерне
2. Проверьте, передается ли `mappedIntent` в Gemini (см. логи)
3. Убедитесь, что антипаттерны добавлены в промпт
4. Возможно, нужно усилить формулировки в `system-prompts.ts`

### Проблема: Ошибки TypeScript при развертывании

**Решение:**
1. Проверьте, что все импорты корректны
2. Убедитесь, что типы в `types.ts` совпадают с использованием
3. Запустите локальную проверку типов (если настроено):
   ```bash
   deno check supabase/functions/telegram-webhook/index.ts
   ```

## Дополнительные ресурсы

- [Полная документация тестирования](./INTENT_RECOGNITION_TESTING.md)
- [Changelog с описанием изменений](./CHANGELOG_INTENT_RECOGNITION.md)
- [Основная документация проекта](../README.md)

## Поддержка

При возникновении проблем:
1. Проверьте логи Supabase Functions
2. Проверьте тестовые сценарии в `INTENT_RECOGNITION_TESTING.md`
3. Создайте Issue с описанием проблемы и логами

