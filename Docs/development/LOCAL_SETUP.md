# Локальная разработка SpotFinder

## Обзор

Это руководство поможет настроить локальное окружение разработки для SpotFinder. Локальная разработка позволяет тестировать изменения без затрат на cloud ресурсы и обеспечивает быстрый цикл разработки.

## Предварительные требования

### 1. Установка Supabase CLI

**Windows (PowerShell):**
```powershell
# Через winget
winget install Supabase.CLI

# Или через npm
npm install -g supabase
```

**macOS:**
```bash
# Через Homebrew
brew install supabase/tap/supabase

# Или через npm
npm install -g supabase
```

**Linux:**
```bash
# Через npm
npm install -g supabase

# Или скачать бинарник
curl -fsSL https://supabase.com/install.sh | sh
```

### 2. Установка Deno

**Windows:**
```powershell
# Через winget
winget install Deno.Deno

# Или через PowerShell
irm https://deno.land/install.ps1 | iex
```

**macOS/Linux:**
```bash
curl -fsSL https://deno.land/install.sh | sh
```

### 3. Установка зависимостей проекта

```bash
npm install
```

## Настройка локального окружения

### 1. Копирование переменных окружения

```bash
# Скопируйте шаблон переменных
cp Docs/ENV_EXAMPLE.md .env

# Отредактируйте .env файл
# Заполните все необходимые значения
```

### 2. Настройка переменных для локальной разработки

В файле `.env` используйте следующие значения для локальной разработки:

```env
# Локальные значения для разработки
SUPABASE_URL=http://localhost:54321
ENVIRONMENT=development
SUPABASE_PROJECT_ID=local

# Остальные значения заполните реальными API ключами
TELEGRAM_BOT_TOKEN=your_real_token
GEMINI_API_KEY=your_real_key
GOOGLE_MAPS_API_KEY=your_real_key
SUPABASE_SERVICE_ROLE_KEY=your_real_key
```

### 3. Запуск локального Supabase

```bash
# Запуск локального Supabase (включает БД, API, Edge Functions)
npm run start

# Или альтернативно
supabase start
```

После запуска вы увидите:
```
Started supabase local development setup.

         API URL: http://localhost:54321
     GraphQL URL: http://localhost:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Настройка переменных окружения для функций

После запуска Supabase, настройте переменные окружения для Edge Functions:

```bash
# Настройка переменных окружения для локальных функций
supabase secrets set TELEGRAM_BOT_TOKEN="your_real_token"
supabase secrets set GEMINI_API_KEY="your_real_key"
supabase secrets set GOOGLE_MAPS_API_KEY="your_real_key"
supabase secrets set SUPABASE_URL="http://localhost:54321"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
supabase secrets set ENVIRONMENT="development"
```

### 5. Запуск Edge Functions локально

```bash
# В отдельном терминале
npm run dev

# Или альтернативно
supabase functions serve
```

## Workflow разработки

### 1. Ежедневная работа

```bash
# 1. Запуск локального окружения
npm run start

# 2. Настройка переменных (только при первом запуске)
supabase secrets set TELEGRAM_BOT_TOKEN="your_token"
# ... остальные переменные

# 3. В отдельном терминале - запуск функций
npm run dev

# 4. Разработка и тестирование
# Функции доступны по адресу: http://localhost:54321/functions/v1/telegram-webhook
```

### 2. Тестирование изменений

```bash
# Запуск тестов
npm run test

# Тесты в watch режиме
npm run test:watch

# Проверка типов
npm run type-check

# Линтинг
npm run lint

# Форматирование
npm run fmt
```

### 3. Тестирование webhook локально

Для тестирования Telegram webhook локально используйте ngrok:

```bash
# Установка ngrok
npm install -g ngrok

# Запуск туннеля
ngrok http 54321

# Настройка webhook на ngrok URL
# https://your-ngrok-url.ngrok.io/functions/v1/telegram-webhook
```

### 4. Деплой в production

```bash
# После завершения разработки
git add .
git commit -m "feat: новая функциональность"
git push origin main

# Автоматический деплой через GitHub Actions
```

## Полезные команды

### Supabase CLI команды

```bash
# Статус локального окружения
npm run status

# Остановка локального окружения
npm run stop

# Сброс базы данных
npm run reset

# Просмотр логов
supabase functions logs telegram-webhook

# Настройка переменных окружения
supabase secrets set KEY="value"

# Просмотр настроенных переменных
supabase secrets list
```

### Отладка

```bash
# Просмотр логов функций
supabase functions logs telegram-webhook --follow

# Проверка webhook статуса
npm run webhook:check

# Настройка webhook
npm run webhook:setup
```

## Структура проекта

```
SpotFinder/
├── supabase/
│   ├── functions/
│   │   ├── _shared/          # Общие модули
│   │   │   ├── config.ts     # Конфигурация
│   │   │   ├── *.ts          # Основная логика
│   │   │   └── *_test.ts     # Тесты
│   │   └── telegram-webhook/ # Edge Function
│   ├── migrations/           # Миграции БД
│   └── config.toml          # Конфигурация Supabase
├── scripts/
│   └── setup-webhook.ts     # Скрипт настройки webhook
├── .env                     # Переменные окружения (не в Git)
└── package.json            # NPM скрипты
```

## Troubleshooting

### Частые проблемы

1. **Порт уже используется:**
   ```bash
   # Остановите все процессы Supabase
   npm run stop
   
   # Или убейте процесс на порту
   lsof -ti:54321 | xargs kill -9
   ```

2. **Ошибки миграций:**
   ```bash
   # Сброс БД
   npm run reset
   
   # Применение миграций заново
   supabase db reset
   ```

3. **Проблемы с переменными окружения:**
   ```bash
   # Проверьте настроенные переменные
   supabase secrets list
   
   # Убедитесь что все переменные заполнены
   ```

4. **Функции не запускаются:**
   ```bash
   # Проверьте логи
   supabase functions logs telegram-webhook
   
   # Перезапустите функции
   npm run dev
   ```

### Отладка Edge Functions

1. **Логи в реальном времени:**
   ```bash
   supabase functions logs telegram-webhook --follow
   ```

2. **Проверка конфигурации:**
   ```bash
   # В коде функции
   console.log('Config:', config.printConfig());
   ```

3. **Тестирование API:**
   ```bash
   curl -X POST http://localhost:54321/functions/v1/telegram-webhook \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

## Интеграция с CI/CD

Локальная разработка интегрируется с CI/CD:

1. **Локальная разработка:** `npm run dev`
2. **Локальное тестирование:** `npm run test`
3. **Коммит и push:** `git push origin main`
4. **Автоматический деплой:** GitHub Actions
5. **Проверка:** Supabase Dashboard

Это обеспечивает полный цикл разработки от локальной среды до production.

## Дополнительные ресурсы

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Deno Documentation](https://deno.land/manual)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Google Maps API](https://developers.google.com/maps/documentation)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)