# CI/CD с GitHub Actions

## Обзор

Проект SpotFinder использует GitHub Actions для автоматического развертывания и тестирования. Это обеспечивает надежный процесс разработки с минимальным вмешательством человека.

## Workflows

### 1. Deploy Workflow (`.github/workflows/deploy.yml`)

**Триггеры:**
- Push в ветку `main`
- Ручной запуск через GitHub UI

**Процесс:**
1. Установка Deno и Supabase CLI
2. Развертывание Edge Functions в Supabase
3. Автоматическая настройка Telegram webhook
4. Проверка успешности развертывания

### 2. Test Workflow (`.github/workflows/test.yml`)

**Триггеры:**
- Push в любую ветку
- Pull Request в `main`

**Процесс:**
1. Запуск всех тестов Deno
2. Проверка форматирования кода
3. Линтинг кода
4. Проверка типов TypeScript

## Настройка GitHub Secrets

Для работы CI/CD необходимо настроить следующие секреты в GitHub:

### Обязательные Secrets

1. **SUPABASE_ACCESS_TOKEN**
   - Получить: Supabase Dashboard → Settings → Access Tokens
   - Использование: Авторизация для развертывания функций

2. **SUPABASE_PROJECT_ID**
   - Получить: Supabase Dashboard → Settings → General → Project URL
   - Формат: `icnnwmjrprufrohiyfpm` (из URL `https://icnnwmjrprufrohiyfpm.supabase.co`)

3. **TELEGRAM_BOT_TOKEN**
   - Получить: @BotFather в Telegram
   - Формат: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

### Настройка Secrets

1. Перейдите в Settings вашего GitHub репозитория
2. Выберите "Secrets and variables" → "Actions"
3. Нажмите "New repository secret"
4. Добавьте каждый секрет с соответствующим именем и значением

## Процесс разработки

### Автоматический деплой

1. **Создайте feature ветку:**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Разработайте и протестируйте локально:**
   ```bash
   npm run dev
   npm run test
   ```

3. **Создайте Pull Request:**
   - Тесты запустятся автоматически
   - Проверьте статус в GitHub Actions

4. **Смержите в main:**
   - Автоматический деплой запустится
   - Webhook будет настроен автоматически

### Ручной деплой

Если нужно развернуть без push в main:

1. Перейдите в Actions вкладку GitHub
2. Выберите "Deploy to Supabase" workflow
3. Нажмите "Run workflow"
4. Выберите ветку и нажмите "Run workflow"

## Мониторинг

### Проверка статуса деплоя

1. **GitHub Actions:**
   - Перейдите в Actions вкладку
   - Проверьте статус последнего запуска

2. **Supabase Dashboard:**
   - Edge Functions → telegram-webhook
   - Проверьте логи и статус

3. **Telegram Webhook:**
   ```bash
   curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
   ```

### Логи и отладка

- **GitHub Actions логи:** Доступны в Actions вкладке
- **Supabase логи:** Dashboard → Edge Functions → Logs
- **Telegram логи:** Проверка через Bot API

## Troubleshooting

### Частые проблемы

1. **Ошибка авторизации Supabase:**
   - Проверьте SUPABASE_ACCESS_TOKEN
   - Убедитесь что токен имеет права на проект

2. **Ошибка настройки webhook:**
   - Проверьте TELEGRAM_BOT_TOKEN
   - Убедитесь что SUPABASE_PROJECT_ID правильный

3. **Тесты не проходят:**
   - Проверьте локально: `deno test --allow-all`
   - Исправьте форматирование: `deno fmt`

### Откат изменений

Если деплой прошел неудачно:

1. **Откатите код:**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Или исправьте и передеплойте:**
   ```bash
   git checkout main
   # исправления
   git commit -m "fix: исправление проблемы"
   git push origin main
   ```

## Безопасность

### Защита секретов

- ✅ Секреты хранятся в GitHub Secrets
- ✅ Не попадают в логи CI/CD
- ✅ Доступны только для авторизованных пользователей

### Рекомендации

- Регулярно обновляйте токены доступа
- Используйте минимальные права для токенов
- Мониторьте использование секретов

## Интеграция с локальной разработкой

CI/CD интегрируется с локальным окружением:

1. **Локальная разработка:** `npm run dev`
2. **Локальное тестирование:** `npm run test`
3. **Автоматический деплой:** Push в main
4. **Проверка:** GitHub Actions + Supabase Dashboard

Это обеспечивает полный цикл разработки от локальной среды до production.

