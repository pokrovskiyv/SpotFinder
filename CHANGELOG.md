# Changelog

Все значимые изменения в проекте SpotFinder Bot будут задокументированы в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
и проект придерживается [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned for v1.1
- Unit тесты для всех модулей
- Интеграционные тесты
- Улучшенное кэширование с geo-hash
- Analytics dashboard
- A/B тестирование промптов

## [1.0.0] - 2024-01-XX

### 🎉 Первый релиз MVP!

#### Added

**Инфраструктура:**
- База данных PostgreSQL + PostGIS с 6 таблицами
- Миграции для всех таблиц с индексами и RLS
- Supabase Edge Functions setup
- Environment variables configuration

**Backend Modules:**
- Session Manager - управление состоянием пользователя
- User Manager - работа с пользователями и предпочтениями
- Gemini API Client - интеграция с Google AI
- Telegram Client - работа с Telegram Bot API
- Telegram Formatter - форматирование сообщений
- Orchestrator - ядро бизнес-логики
- Context Handler - обработка уточняющих вопросов
- Utilities - вспомогательные функции

**AI Features:**
- Система промптов для Gemini API
- Понимание неявных намерений
- Определение срочности запроса
- Контекстные диалоги
- Персонализация на основе предпочтений

**Telegram Bot:**
- Команды: `/start`, `/help`, `/location`
- Обработка геолокации
- Обработка текстовых запросов
- Inline кнопки (карта, маршрут, детали)
- Callback query обработка

**Документация:**
- README.md - главная документация
- QUICKSTART.md - быстрый старт
- DEPLOYMENT.md - руководство по развертыванию
- TESTING.md - руководство по тестированию
- SETUP_GOOGLE_API.md - настройка API
- CONTRIBUTING.md - гайд для контрибьюторов
- PROJECT_SUMMARY.md - полная сводка
- NEXT_STEPS.md - следующие шаги
- IMPLEMENTATION_COMPLETE.md - детали реализации

**Scripts:**
- setup-webhook.sh - установка Telegram webhook
- delete-webhook.sh - удаление webhook
- setup-telegram-commands.sh - настройка команд
- check-status.sh - проверка статуса

#### Database Schema

**Tables:**
- `users` - пользователи Telegram
- `sessions` - активные сессии с геолокацией и контекстом
- `user_preferences` - предпочтения пользователей
- `search_history` - история поисков для аналитики
- `places_cache` - кэш мест из Google Maps API

**Features:**
- PostGIS для геопространственных запросов
- RLS (Row Level Security) на всех таблицах
- Оптимизированные индексы
- Foreign keys с CASCADE
- TTL для кэша (24 часа)

#### Supported Categories (MVP)
- Еда (кафе, рестораны)
- Аптеки
- Банкоматы и банки
- Магазины
- Развлечения

#### Features
- ✅ Поиск по естественному языку
- ✅ Понимание неявных намерений ("промочил ноги" → обувь)
- ✅ Контекстные уточнения ("а у второго есть парковка?")
- ✅ Определение срочности
- ✅ Учет времени суток
- ✅ Персонализация
- ✅ Кэширование API запросов
- ✅ Session management с TTL
- ✅ Inline кнопки для действий

#### Technical Stack
- Backend: Supabase Edge Functions (TypeScript/Deno)
- Database: Supabase PostgreSQL + PostGIS
- AI: Google Gemini API с Maps Grounding
- Maps: Google Maps Platform (Places API)
- Bot Platform: Telegram Bot API

#### Known Limitations
- Только 5 основных категорий мест (MVP scope)
- Нет автоматического бронирования (запланировано в v2.0)
- Нет мультишаговых маршрутов (запланировано в v3.0)
- Поддержка только русского языка
- Нет unit/integration тестов (запланировано в v1.1)

#### Performance
- Целевое время ответа: < 5 секунд
- Кэширование: Places API результаты (TTL 24 часа)
- Session TTL: 30 минут
- Location TTL: 20 минут

#### Security
- ✅ RLS включен на всех таблицах
- ✅ API ключи через environment variables
- ✅ Service role key только в Edge Functions
- ✅ Валидация входных данных
- ✅ CORS headers настроены

---

## Версионирование

### MAJOR.MINOR.PATCH

- **MAJOR** (1.0.0): Breaking changes, несовместимые с предыдущей версией
- **MINOR** (0.1.0): Новые фичи, backward compatible
- **PATCH** (0.0.1): Bug fixes, никаких изменений в API

### Типы изменений

- `Added` - новые фичи
- `Changed` - изменения в существующей функциональности
- `Deprecated` - функции, которые скоро будут удалены
- `Removed` - удаленные фичи
- `Fixed` - исправления багов
- `Security` - исправления уязвимостей

---

## Roadmap

### v1.1 (следующий релиз)
**Фокус:** Тестирование и оптимизация

- [ ] Unit тесты (Deno.test)
- [ ] Интеграционные тесты
- [ ] Улучшенное кэширование (geo-hash)
- [ ] Analytics dashboard
- [ ] A/B тестирование промптов
- [ ] Webhook для user feedback
- [ ] Расширенная обработка ошибок

### v2.0
**Фокус:** Транзакционные функции

- [ ] Бронирование столиков
- [ ] Заказ такси через API
- [ ] Онлайн оплата
- [ ] Push уведомления
- [ ] Сохраненные места (избранное)

### v3.0
**Фокус:** Планировщик

- [ ] Мультишаговые маршруты
- [ ] Оптимизация маршрутов
- [ ] Групповые поездки
- [ ] Календарь событий
- [ ] Социальные функции

### Future
- [ ] Поддержка английского языка
- [ ] Mobile app
- [ ] Web interface
- [ ] Интеграция с другими мессенджерами
- [ ] ML для персонализации
- [ ] Voice input

---

## Migration Guides

При обновлении версий, см. соответствующие migration guides:

- [v1.0 to v1.1](./docs/migrations/v1.0-to-v1.1.md) - Coming soon
- [v1.1 to v2.0](./docs/migrations/v1.1-to-v2.0.md) - Coming soon

---

**Примечание:** Этот файл обновляется с каждым релизом. Для детальных изменений см. [GitHub Releases](https://github.com/your-repo/spotfinder/releases).

