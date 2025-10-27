# Product Requirements Document (PRD)
## SpotFinder - Гиперлокальный AI-ассистент для поиска мест

**Версия:** 1.0  
**Дата:** Январь 2024  
**Статус:** Approved - Implementation Complete  
**Автор:** SpotFinder Team

---

## 1. Executive Summary

### 1.1 Описание продукта

SpotFinder - это интеллектуальный Telegram-бот, который помогает пользователям мгновенно находить нужные места рядом с их текущей локацией, используя естественный язык и AI-понимание намерений.

**Ключевое отличие:** Вместо традиционного поиска по категориям ("Кафе" → "Рестораны" → "Фильтры"), пользователь просто описывает свою потребность на естественном языке:
- "Промочил ноги" → Обувные магазины
- "Хочу поработать" → Кафе с Wi-Fi и тихой атмосферой
- "У меня сел телефон" → Места с розетками поблизости

### 1.2 Проблема

**Текущая ситуация:**
- Поиск мест требует навигации через множество меню и категорий
- Пользователи не всегда знают точное название категории
- Существующие решения не понимают контекст и намерения
- Нет персонализации на основе предпочтений

**Боль пользователя:**
- "Я не знаю, как называется то, что мне нужно"
- "Мне нужно срочно, некогда разбираться в интерфейсе"
- "Почему я не могу просто сказать, что мне нужно?"

### 1.3 Решение

AI-ассистент, который:
1. **Понимает естественный язык** - говори как с человеком
2. **Распознает намерения** - понимает неявные запросы
3. **Учитывает контекст** - время суток, срочность, погода
4. **Ведет диалог** - можно уточнять детали
5. **Персонализируется** - запоминает предпочтения

---

## 2. Бизнес-цели и метрики

### 2.1 Цели

**Краткосрочные (3 месяца):**
- Запустить MVP с 10+ активными пользователями
- Достичь 80%+ точности понимания запросов
- Время ответа < 5 секунд для 90% запросов

**Среднесрочные (6 месяцев):**
- 100+ активных пользователей
- Средняя retention 40%+ (WAU/MAU)
- 3+ запроса на пользователя в неделю

**Долгосрочные (12 месяцев):**
- 1000+ активных пользователей
- Монетизация (премиум подписка или реклама)
- Расширение на другие мессенджеры

### 2.2 Ключевые метрики успеха (KPI)

| Метрика | MVP | v1.1 | v2.0 |
|---------|-----|------|------|
| Accuracy (понимание запросов) | 80% | 85% | 90% |
| Response Time (p90) | <5 сек | <3 сек | <2 сек |
| Success Rate (успешных поисков) | 75% | 85% | 90% |
| Follow-up Rate (% уточнений) | 30% | 40% | 50% |
| User Satisfaction (1-5) | 4.0 | 4.3 | 4.5 |

### 2.3 Модель монетизации

**Freemium модель (v2.0):**

**Free tier:**
- До 10 запросов в день
- 5 основных категорий
- Базовая персонализация

**Premium ($2.99/месяц):**
- Unlimited запросы
- Все категории
- Приоритетный поиск
- Расширенная персонализация
- Сохраненные места (избранное)

**Enterprise (по запросу):**
- White-label решение для бизнеса
- API доступ
- Кастомизация

---

## 3. Целевая аудитория

### 3.1 Primary Personas

#### Persona 1: "Активный горожанин" (Александр, 28 лет)
- **Профессия:** IT-специалист
- **Локация:** Москва
- **Поведение:** 
  - Часто работает из кафе
  - Ценит время
  - Использует Telegram как основной мессенджер
- **Потребности:**
  - Быстро найти место для работы
  - Wi-Fi и розетки обязательны
  - Не хочет тратить время на поиск
- **Pain points:**
  - Google Maps слишком общий
  - 2GIS показывает все подряд
  - Нужна фильтрация по специфичным параметрам

#### Persona 2: "Турист" (Мария, 35 лет)
- **Профессия:** Маркетолог
- **Локация:** Путешествует по России
- **Поведение:**
  - Часто в незнакомых городах
  - Ищет аутентичные места
  - Доверяет рекомендациям
- **Потребности:**
  - Найти что-то "местное", не туристическое
  - Быстро сориентироваться в незнакомом месте
  - Получить рекомендации с контекстом
- **Pain points:**
  - Туристические места переполнены
  - Сложно найти "для местных"
  - Нет персонализированных рекомендаций

#### Persona 3: "Родитель" (Екатерина, 32 года)
- **Профессия:** Менеджер
- **Локация:** Санкт-Петербург
- **Поведение:**
  - Часто с ребенком
  - Нужны специфичные условия (детская зона, пеленальный столик)
  - Планирует заранее
- **Потребности:**
  - Места, дружественные к детям
  - Быстро решать возникающие ситуации ("нужен туалет")
  - Планировать маршруты с детьми
- **Pain points:**
  - Не все места подходят для детей
  - Информация о детских удобствах неполная
  - Сложно найти актуальную информацию

### 3.2 Secondary Personas

- Пожилые люди (поиск аптек, банков)
- Студенты (бюджетные места)
- Иностранцы (языковой барьер)

---

## 4. User Stories и Use Cases

### 4.1 Core User Stories (MVP)

**Epic 1: Поиск мест**

```
As a пользователь
I want to найти место, описав свою потребность на естественном языке
So that я могу быстро получить релевантные результаты без навигации по меню
```

**User Stories:**
1. US-001: Как пользователь, я хочу написать "найди кофейню" и получить список ближайших кофеен
2. US-002: Как пользователь, я хочу написать "промочил ноги" и получить обувные магазины
3. US-003: Как пользователь, я хочу написать "хочу поработать" и получить кафе с Wi-Fi
4. US-004: Как пользователь, я хочу получить информацию о месте (адрес, часы, рейтинг)
5. US-005: Как пользователь, я хочу построить маршрут до места одной кнопкой

**Epic 2: Контекстные диалоги**

```
As a пользователь
I want to уточнять детали о найденных местах
So that я могу получить именно ту информацию, которая мне нужна
```

**User Stories:**
1. US-010: Как пользователь, я хочу спросить "а у второго есть парковка?" после получения списка
2. US-011: Как пользователь, я хочу спросить "какой у первого рейтинг?"
3. US-012: Как пользователь, я хочу спросить "далеко ли третий?" и получить расстояние
4. US-013: Как пользователь, я хочу сравнить "что дешевле - первый или второй?"

**Epic 3: Персонализация**

```
As a пользователь
I want to чтобы бот запоминал мои предпочтения
So that я получал более релевантные результаты
```

**User Stories:**
1. US-020: Как веган, я хочу получать только места с веганскими опциями
2. US-021: Как пользователь, я хочу, чтобы бот помнил, что я предпочитаю тихие места
3. US-022: Как пользователь, я хочу сохранить домашний и рабочий адрес
4. US-023: Как пользователь, я хочу, чтобы бот учился из моих выборов

### 4.2 Use Cases

**UC-001: Быстрый поиск (Urgent)**
```
Preconditions: Пользователь поделился геолокацией
Main Flow:
1. Пользователь: "Срочно нужна аптека"
2. Система: Определяет высокую срочность
3. Система: Ищет ближайшую ОТКРЫТУЮ аптеку
4. Система: Возвращает 1 место с расстоянием и кнопкой "Построить маршрут"
Postconditions: Пользователь получил самое близкое место за <3 секунды
```

**UC-002: Исследовательский поиск (Exploratory)**
```
Preconditions: Пользователь поделился геолокацией
Main Flow:
1. Пользователь: "Что тут интересного?"
2. Система: Определяет низкую срочность
3. Система: Анализирует окрестности
4. Система: Возвращает 5 разнообразных мест (кафе, парк, музей, магазин)
5. Пользователь: "Расскажи подробнее про второе"
6. Система: Возвращает детали про парк
Postconditions: Пользователь исследовал несколько вариантов
```

**UC-003: Контекстное уточнение**
```
Preconditions: Пользователь уже получил список результатов
Main Flow:
1. Пользователь: "Найди ресторан"
2. Система: Возвращает 3 ресторана
3. Пользователь: "А у первого есть веганское меню?"
4. Система: Извлекает первый ресторан из контекста
5. Система: Запрашивает детальную информацию
6. Система: Возвращает ответ о веганских опциях
Postconditions: Пользователь получил уточнение без нового поиска
```

---

## 5. Функциональные требования

### 5.1 MVP Scope (v1.0)

#### 5.1.1 Обязательные функции

**F-001: Поиск по естественному языку**
- **Priority:** P0 (Must Have)
- **Description:** Пользователь может описать потребность на естественном языке
- **Acceptance Criteria:**
  - Поддержка запросов длиной до 200 символов
  - Понимание русского языка
  - Обработка опечаток и сокращений
  - Success rate >80% для базовых запросов

**F-002: Понимание неявных намерений**
- **Priority:** P0 (Must Have)
- **Description:** Система распознает неявные намерения
- **Examples:**
  - "Промочил ноги" → обувные магазины
  - "Заболел" → аптеки
  - "Сел телефон" → места с розетками
- **Acceptance Criteria:**
  - Accuracy >75% для 10 типичных неявных запросов
  - Fallback на уточняющий вопрос при неуверенности

**F-003: Управление геолокацией**
- **Priority:** P0 (Must Have)
- **Description:** Система запрашивает и валидирует геолокацию
- **Acceptance Criteria:**
  - Запрос геолокации при /start
  - TTL геолокации = 20 минут
  - Переспрос при устаревшей локации
  - Кнопка для быстрой отправки локации

**F-004: Контекстные уточнения**
- **Priority:** P0 (Must Have)
- **Description:** Пользователь может задавать уточняющие вопросы
- **Acceptance Criteria:**
  - Распознавание ссылок на предыдущие результаты ("первый", "второй", "у него")
  - Сохранение контекста диалога до 30 минут
  - Поддержка до 3 уровней вложенности диалога

**F-005: Inline кнопки для действий**
- **Priority:** P0 (Must Have)
- **Description:** Каждое место имеет кнопки действий
- **Buttons:**
  - "🗺 Показать на карте" → открывает Google Maps
  - "🚶 Как добраться" → построение маршрута
  - "ℹ️ Подробнее" → детальная информация
- **Acceptance Criteria:**
  - Кнопки работают во всех клиентах Telegram
  - Ссылки открываются корректно
  - Callback обрабатываются <1 сек

#### 5.1.2 Желательные функции

**F-010: Персонализация**
- **Priority:** P1 (Should Have)
- **Description:** Учет предпочтений пользователя
- **Features:**
  - Dietary restrictions (веган, gluten-free)
  - Preferred transport mode
  - Learning from history

**F-011: Кэширование**
- **Priority:** P1 (Should Have)
- **Description:** Кэширование популярных запросов
- **Acceptance Criteria:**
  - Cache hit rate >40%
  - TTL = 24 часа
  - Geo-hash группировка

### 5.2 Категории мест (MVP)

**Поддерживаемые:**
1. **Еда** - кафе, рестораны, фастфуд, бары
2. **Аптеки** - аптеки, аптечные пункты
3. **Финансы** - банкоматы, банки, обменники
4. **Магазины** - продукты, одежда, техника
5. **Развлечения** - кино, боулинг, парки, музеи

**Не поддерживается в MVP:**
- Отели (в v2.0)
- Медицинские услуги (в v2.0)
- Автосервисы (в v2.0)
- Образование (в v2.0)

### 5.3 Команды бота

| Команда | Описание | Priority |
|---------|----------|----------|
| `/start` | Начать работу, запросить геолокацию | P0 |
| `/help` | Справка по использованию | P0 |
| `/location` | Обновить геолокацию | P0 |
| `/settings` | Настройки и предпочтения | P1 |
| `/history` | История поисков | P2 |

---

## 6. Нефункциональные требования

### 6.1 Производительность

**NFR-001: Response Time**
- **Requirement:** 90% запросов должны обрабатываться <5 секунд
- **Measurement:** P90 latency из логов
- **Priority:** P0

**NFR-002: Availability**
- **Requirement:** Uptime ≥99% (7.2 часа downtime в месяц)
- **Measurement:** Supabase monitoring
- **Priority:** P0

**NFR-003: Scalability**
- **Requirement:** Поддержка 1000+ активных пользователей без деградации
- **Measurement:** Load testing
- **Priority:** P1

### 6.2 Безопасность

**NFR-010: Data Privacy**
- **Requirement:** 
  - Геолокация не хранится постоянно (только в сессии с TTL)
  - История поисков анонимизирована
  - Compliance с GDPR
- **Priority:** P0

**NFR-011: API Security**
- **Requirement:**
  - API ключи в environment variables
  - RLS на всех таблицах БД
  - Rate limiting на API endpoints
- **Priority:** P0

### 6.3 Usability

**NFR-020: Learning Curve**
- **Requirement:** Новый пользователь должен успешно выполнить первый поиск за <2 минуты
- **Measurement:** Onboarding analytics
- **Priority:** P0

**NFR-021: Error Handling**
- **Requirement:** Все ошибки должны иметь понятные пользователю сообщения
- **Priority:** P0

### 6.4 Maintainability

**NFR-030: Code Quality**
- **Requirement:**
  - TypeScript типы везде
  - Test coverage >70% для v1.1
  - JSDoc для всех public методов
- **Priority:** P1

**NFR-031: Monitoring**
- **Requirement:**
  - Логирование всех критических операций
  - Alerting на ошибки
  - Dashboard для метрик
- **Priority:** P1

---

## 7. Технические требования

### 7.1 Technology Stack

**Backend:**
- Platform: Supabase Edge Functions (Deno runtime)
- Language: TypeScript
- Framework: Native Deno HTTP

**Database:**
- Primary: Supabase PostgreSQL 15
- Extensions: PostGIS для геопространственных запросов
- Cache: PostgreSQL tables (sessions, places_cache)

**AI/ML:**
- LLM: Google Gemini Pro с Maps Grounding
- Maps: Google Maps Platform (Places API New)

**Messaging:**
- Platform: Telegram Bot API
- Protocol: Webhook (HTTPS POST)

### 7.2 Архитектура

```
┌─────────────────┐
│  Telegram User  │
└────────┬────────┘
         │ Message/Location
         ▼
┌─────────────────────┐
│  Telegram Bot API   │ (Webhook)
└────────┬────────────┘
         │ HTTPS POST
         ▼
┌──────────────────────────────┐
│ Supabase Edge Function       │
│  (telegram-webhook)          │
│  ┌──────────────────────┐   │
│  │   Orchestrator       │   │ ◄─── Core Logic
│  └──────────┬───────────┘   │
│             │                │
│  ┌──────────▼──────────────┐│
│  │  Session Manager        ││ ◄─── State
│  └──────────┬──────────────┘│
│             │                │
│  ┌──────────▼──────────────┐│
│  │  Gemini Client          ││ ◄─── AI
│  └──────────┬──────────────┘│
└─────────────┼────────────────┘
              │
      ┌───────▼────────┐
      │  Google APIs   │
      │  - Gemini Pro  │
      │  - Maps API    │
      └────────────────┘
```

### 7.3 Data Model

**Таблицы:**
1. `users` - пользователи Telegram
2. `sessions` - активные сессии с контекстом
3. `user_preferences` - предпочтения пользователей
4. `search_history` - история для аналитики
5. `places_cache` - кэш мест из Google Maps

Подробнее: [Docs/Data-model.md](./Docs/Data-model.md)

### 7.4 Интеграции

**Обязательные:**
- ✅ Telegram Bot API (webhook)
- ✅ Google Gemini API
- ✅ Google Maps Platform (Places API)

**Опциональные (v2.0):**
- ❌ OpenTable API (бронирование)
- ❌ Uber/Yandex Taxi API
- ❌ Payment providers

---

## 8. MVP Definition

### 8.1 In Scope

**✅ Включено в MVP:**
1. Поиск по естественному языку (5 категорий)
2. Понимание неявных намерений (10 типичных паттернов)
3. Контекстные уточнения (до 3 уровней)
4. Управление геолокацией с TTL
5. Inline кнопки для действий
6. Базовая персонализация (dietary restrictions)
7. Кэширование Places API результатов
8. Telegram команды: /start, /help, /location

**Метрики успеха MVP:**
- 10+ активных пользователей
- 80%+ accuracy понимания запросов
- <5 сек response time (p90)
- 70%+ успешных уточняющих вопросов

### 8.2 Out of Scope

**❌ НЕ включено в MVP (v2.0+):**
1. Бронирование столиков / билетов
2. Онлайн оплата
3. Заказ такси
4. Push-уведомления
5. Мультишаговые маршруты
6. Групповые поездки
7. Социальные функции
8. Поддержка английского языка
9. Web/mobile приложения
10. Голосовой ввод

---

## 9. Roadmap

### Phase 1: MVP (v1.0) - ✅ COMPLETE
**Timeline:** Январь 2024 (4-6 недель)
**Focus:** Core functionality

**Deliverables:**
- ✅ Базовая архитектура
- ✅ 5 категорий мест
- ✅ Понимание намерений
- ✅ Контекстные диалоги
- ✅ Документация

### Phase 2: Optimization (v1.1)
**Timeline:** Февраль 2024 (2-3 недели)
**Focus:** Quality & Performance

**Deliverables:**
- [ ] Unit & Integration тесты
- [ ] Улучшенное кэширование (geo-hash)
- [ ] Analytics dashboard
- [ ] A/B тестирование промптов
- [ ] Performance optimization

### Phase 3: Expansion (v1.5)
**Timeline:** Март 2024 (3-4 недели)
**Focus:** User growth

**Deliverables:**
- [ ] 10 дополнительных категорий
- [ ] Расширенная персонализация
- [ ] Saved places (избранное)
- [ ] Sharing функции
- [ ] Referral program

### Phase 4: Transactions (v2.0)
**Timeline:** Q2 2024 (6-8 недель)
**Focus:** Монетизация

**Deliverables:**
- [ ] Booking integration
- [ ] Taxi integration
- [ ] Premium subscription
- [ ] Payment processing
- [ ] Revenue dashboard

### Phase 5: Intelligence (v3.0)
**Timeline:** Q3 2024 (8-10 недель)
**Focus:** Advanced AI

**Deliverables:**
- [ ] Мультишаговое планирование
- [ ] Predictive recommendations
- [ ] Voice input/output
- [ ] Multi-language support
- [ ] ML personalization

---

## 10. Риски и митигация

### 10.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Превышение лимитов Gemini API | High | Medium | Агрессивное кэширование, rate limiting, fallback to simpler search |
| Неточность геолокации | Medium | High | TTL 20 минут, переспрос, manual correction |
| Долгий ответ AI (>5 сек) | Medium | Medium | "Typing..." indicator, async processing, caching |
| Google Maps API costs | High | Low | Budget alerts, caching strategy, quota monitoring |

### 10.2 Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Низкая adoption rate | High | Medium | Beta testing, user feedback, iterative improvements |
| Конкуренция (Google, Yandex) | High | High | Focus на niche use cases, superior UX, AI понимание |
| Telegram policy changes | Medium | Low | Multi-platform strategy (v3.0), monitoring policies |

### 10.3 AI/ML Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Некорректное понимание намерений | High | Medium | Iterative prompt engineering, user feedback loop, fallback to clarification |
| Hallucinations в ответах | Medium | Low | Grounding в реальные данные (Maps API), validation |
| Bias в рекомендациях | Medium | Low | Regular audits, diverse test cases, feedback механизм |

---

## 11. Success Metrics & KPIs

### 11.1 Product Metrics

**Engagement:**
- DAU (Daily Active Users)
- WAU/MAU ratio (retention)
- Sessions per user per week
- Queries per session

**Performance:**
- Query success rate (%)
- Response time (p50, p90, p99)
- Follow-up query rate (%)
- Cache hit rate (%)

**Quality:**
- User satisfaction score (1-5)
- Intent recognition accuracy (%)
- Click-through rate on results
- Place selection rate

### 11.2 Business Metrics

**Growth:**
- New user sign-ups per week
- User retention (D1, D7, D30)
- Referral rate
- Viral coefficient

**Monetization (v2.0):**
- Conversion rate (free → premium)
- ARPU (Average Revenue Per User)
- LTV (Lifetime Value)
- CAC (Customer Acquisition Cost)

---

## 12. Dependencies & Assumptions

### 12.1 External Dependencies

1. **Google/Gemini API**
   - Assumption: API будет стабильно доступен
   - Risk: Rate limits, downtime, price changes

2. **Google Maps Platform**
   - Assumption: Places API будет достаточно точным
   - Risk: Costs могут вырасти

3. **Telegram Platform**
   - Assumption: API не изменится кардинально
   - Risk: Policy changes

4. **Supabase**
   - Assumption: Platform стабилен и масштабируется
   - Risk: Vendor lock-in

### 12.2 Internal Assumptions

1. Пользователи будут делиться геолокацией
2. 80%+ запросов можно обработать в 5 категориях
3. Русский язык достаточен для MVP
4. Telegram - preferred platform для target audience

---

## 13. Compliance & Legal

### 13.1 Data Privacy

- **GDPR Compliance:** Да (для российских пользователей)
- **Data Retention:** 
  - Геолокация: Session only (TTL 20 min)
  - История: 90 дней
  - Preferences: Until account deletion
- **Right to Deletion:** Предусмотрено

### 13.2 Terms of Service

- User agreement при /start
- Privacy policy link
- Data usage disclosure
- API terms compliance (Google, Telegram)

---

## 14. Поддержка и документация

### 14.1 User Documentation

- **In-app:** 
  - `/help` команда
  - Contextual hints
  - Example queries

- **External:**
  - README.md - overview
  - FAQ - common questions
  - Video tutorials (v1.1)

### 14.2 Developer Documentation

- **Реализовано:**
  - ✅ README.md
  - ✅ QUICKSTART.md
  - ✅ DEPLOYMENT.md
  - ✅ TESTING.md
  - ✅ CONTRIBUTING.md
  - ✅ Architecture docs

- **Планируется:**
  - API reference docs
  - Troubleshooting guide
  - Performance tuning guide

---

## 15. Приложения

### Appendix A: User Research

*[To be conducted during beta]*
- User interviews (10-15)
- Survey results
- Usage analytics
- Pain points analysis

### Appendix B: Competitive Analysis

**Конкуренты:**
1. Google Maps - universal, но не AI-driven
2. 2GIS - хорош для бизнеса, но сложный интерфейс
3. Foursquare - мертв в России
4. Яндекс.Карты - похож на Google Maps

**Наше преимущество:**
- AI-понимание намерений
- Conversational interface
- Контекстные диалоги
- Персонализация

### Appendix C: Technical Specifications

См. подробную техническую документацию:
- [Architecture.md](./Docs/Architecture.md)
- [Data-model.md](./Docs/Data-model.md)
- [functionality.md](./Docs/functionality.md)
- [meta-model.md](./Docs/meta-model.md)

---

## 16. Approval & Sign-off

**Product Owner:** ___________________  
**Engineering Lead:** ___________________  
**Design Lead:** ___________________  

**Date:** _____________

---

**Версия:** 1.0  
**Статус:** Approved  
**Последнее обновление:** Январь 2024

