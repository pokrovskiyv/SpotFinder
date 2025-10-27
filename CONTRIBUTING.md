# 🤝 Contributing to SpotFinder Bot

Спасибо за интерес к проекту! Любые контрибуции приветствуются.

## Как начать

1. Fork репозитория
2. Создай feature branch (`git checkout -b feature/amazing-feature`)
3. Сделай изменения
4. Commit изменения (`git commit -m 'Add amazing feature'`)
5. Push в branch (`git push origin feature/amazing-feature`)
6. Открой Pull Request

## Типы контрибуций

### 🐛 Баг-репорты

Открой issue с:
- Описанием проблемы
- Шагами для воспроизведения
- Ожидаемым vs. фактическим результатом
- Логами (если есть)
- Версией/окружением

### ✨ Feature requests

Предложи новую функцию:
- Опиши use case
- Почему это важно?
- Как это должно работать?
- Есть ли альтернативы?

### 💻 Code contributions

#### Области для улучшения

**High Priority:**
- [ ] Unit тесты для всех модулей
- [ ] Интеграционные тесты
- [ ] Улучшение обработки ошибок
- [ ] Оптимизация промптов для Gemini
- [ ] Кэширование geo-hash

**Medium Priority:**
- [ ] Поддержка нескольких языков
- [ ] Webhook для получения feedback от пользователей
- [ ] Dashboard для аналитики
- [ ] A/B тестирование промптов

**Low Priority:**
- [ ] Экспорт истории поиска
- [ ] Расширенные фильтры
- [ ] Интеграция с другими мессенджерами

## Стандарты кода

### TypeScript Style Guide

```typescript
// ✅ Good
export class SessionManager {
  private supabase: SupabaseClient;

  constructor(url: string, key: string) {
    this.supabase = createClient(url, key);
  }

  async getSession(userId: number): Promise<Session | null> {
    // Clear intent, typed return
    const { data, error } = await this.supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) return null;
    return data as Session;
  }
}

// ❌ Bad
export class sessionmanager {
  private db: any;

  async get(id) {
    // Unclear types, any usage
    let x = await this.db.from('sessions').select().eq('user_id', id);
    return x.data;
  }
}
```

### Ключевые правила

1. **Именование:**
   - Classes: `PascalCase`
   - Functions: `camelCase`
   - Constants: `UPPER_SNAKE_CASE`
   - Files: `kebab-case.ts`

2. **Types:**
   - Всегда указывай типы для параметров и возвращаемых значений
   - Избегай `any` - используй `unknown` если тип неизвестен
   - Создавай интерфейсы для объектов

3. **Async/Await:**
   - Используй async/await вместо `.then()`
   - Всегда обрабатывай ошибки с try/catch

4. **Комментарии:**
   - JSDoc для всех public методов
   - Inline комментарии для сложной логики
   - На русском или английском (консистентно)

### Пример хорошего кода

```typescript
/**
 * Calculate distance between two geographic points
 * @param point1 First location
 * @param point2 Second location
 * @returns Distance in meters
 */
export function calculateDistance(
  point1: Location,
  point2: Location
): number {
  const R = 6371000; // Earth's radius in meters
  
  // Convert to radians
  const φ1 = (point1.lat * Math.PI) / 180;
  const φ2 = (point2.lat * Math.PI) / 180;
  const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
  const Δλ = ((point2.lon - point1.lon) * Math.PI) / 180;

  // Haversine formula
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
```

## Тестирование

### Перед созданием PR

1. **Локальное тестирование:**
   ```bash
   # Запусти локально
   supabase start
   supabase functions serve telegram-webhook --env-file .env.local
   
   # Протестируй основные сценарии
   - /start
   - Отправка геолокации
   - Поиск мест
   - Уточняющие вопросы
   ```

2. **Проверка кода:**
   ```bash
   # Type checking
   deno check supabase/functions/**/*.ts
   
   # Formatting
   deno fmt supabase/functions/
   ```

3. **Проверка миграций:**
   ```bash
   # Если добавил новые миграции
   supabase db reset
   # Проверь, что все применяется без ошибок
   ```

### Написание тестов

Если добавляешь новую функциональность, добавь тесты:

```typescript
// supabase/functions/_shared/utils.test.ts
import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { extractOrdinal } from './utils.ts';

Deno.test("extractOrdinal extracts Russian ordinals", () => {
  assertEquals(extractOrdinal("первый"), 1);
  assertEquals(extractOrdinal("у второго ресторана"), 2);
  assertEquals(extractOrdinal("третье кафе"), 3);
});

Deno.test("extractOrdinal returns null for invalid input", () => {
  assertEquals(extractOrdinal("нет числа тут"), null);
});
```

## Структура Pull Request

### Хороший PR включает:

1. **Описательный заголовок:**
   - ✅ `feat: Add caching for popular search queries`
   - ✅ `fix: Handle expired location correctly`
   - ❌ `Update code`
   - ❌ `Fix bug`

2. **Описание:**
   ```markdown
   ## What
   Adds caching for search queries using geo-hash grouping
   
   ## Why
   Reduces API calls to Google Maps by 40% for popular locations
   
   ## How
   - Implemented geo-hash algorithm in utils.ts
   - Added cache lookup before API call in gemini-client.ts
   - Added TTL of 24 hours for cache entries
   
   ## Testing
   - Tested with 100 identical queries
   - Verified cache hit rate in logs
   - Manual testing in production
   
   ## Screenshots (if applicable)
   [Before/After performance metrics]
   ```

3. **Чистая история коммитов:**
   - Squash мелкие commits ("fix typo", "oops")
   - Каждый commit должен быть атомарным
   - Используй conventional commits:
     - `feat:` - новая функция
     - `fix:` - исправление бага
     - `docs:` - изменения в документации
     - `refactor:` - рефакторинг без изменения функциональности
     - `test:` - добавление тестов
     - `chore:` - обновление зависимостей и т.п.

4. **Связанные issues:**
   ```markdown
   Closes #42
   Relates to #38
   ```

## Code Review Process

1. **Автоматические проверки:**
   - Type checking проходит
   - Нет очевидных security issues
   - Код отформатирован

2. **Ручная проверка:**
   - Код читабелен и понятен
   - Следует архитектуре проекта
   - Нет дублирования кода
   - Есть комментарии для сложной логики

3. **Функциональная проверка:**
   - Фича работает как описано
   - Нет регрессий в существующей функциональности
   - Edge cases обработаны

## Архитектурные решения

### Когда создавать новый модуль

Создавай новый файл в `_shared/` если:
- Логика используется в нескольких местах
- Модуль имеет четкую ответственность
- Код превышает ~200 строк

### Когда модифицировать существующий

Модифицируй существующий если:
- Изменение тесно связано с текущей логикой
- Не нарушает single responsibility
- Улучшает существующий код

### Dependency injection

```typescript
// ✅ Good - dependencies injected
class Orchestrator {
  constructor(
    private sessionManager: SessionManager,
    private geminiClient: GeminiClient
  ) {}
}

// ❌ Bad - hard-coded dependencies
class Orchestrator {
  private sessionManager = new SessionManager();
  private geminiClient = new GeminiClient();
}
```

## Релизный процесс

### Версионирование (SemVer)

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backward compatible
- **PATCH** (0.0.1): Bug fixes

### Changelog

Обновляй `CHANGELOG.md` при каждом релизе:

```markdown
## [1.1.0] - 2024-01-15

### Added
- Caching for popular searches
- Support for multiple languages

### Fixed
- Location expiry not working correctly
- Gemini API rate limiting

### Changed
- Improved prompt engineering for better intent understanding
```

## Вопросы?

- 📧 Email: [maintainer-email]
- 💬 Telegram: [@username]
- 📝 GitHub Discussions: [link]

## Лицензия

Внося вклад, вы соглашаетесь, что ваш код будет лицензирован под MIT License.

---

**Спасибо за вклад в SpotFinder! 🎉**

