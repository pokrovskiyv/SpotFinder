# 🎯 Следующие шаги для запуска SpotFinder Bot

## ✅ Что уже сделано

Вся кодовая база и документация реализованы! Проект готов к развертыванию.

**Реализовано:**
- ✅ 6 таблиц БД с миграциями
- ✅ 8 основных модулей (Session Manager, Gemini Client, Orchestrator и др.)
- ✅ Telegram webhook handler
- ✅ AI система с промптами
- ✅ Полная документация (README, QUICKSTART, DEPLOYMENT, TESTING)
- ✅ Вспомогательные скрипты
- ✅ TypeScript типы и интерфейсы

**Строк кода:** ~3,500+
**Файлов:** ~35
**Время разработки:** Несколько часов интенсивной работы 🚀

---

## 📋 Что нужно сделать ТЕБЕ

### Шаг 1: Получить API ключи (15-20 минут)

#### 1.1. Telegram Bot Token
1. Открой [@BotFather](https://t.me/BotFather) в Telegram
2. Отправь `/newbot`
3. Придумай название и username для бота
4. Сохрани полученный токен

#### 1.2. Google/Gemini API
Следуй детальной инструкции: [SETUP_GOOGLE_API.md](./SETUP_GOOGLE_API.md)

**Кратко:**
1. [Google AI Studio](https://aistudio.google.com/app/apikey) → Get API Key → скопируй
2. [Google Cloud Console](https://console.cloud.google.com) → Create Project
3. Enable APIs: "Generative Language API", "Places API (New)"
4. Create API Key для Maps → скопируй
5. Настрой биллинг (нужен для Maps Platform)

#### 1.3. Supabase
1. Создай проект на [supabase.com](https://supabase.com)
2. Скопируй из Settings → API:
   - `Project URL`
   - `anon public` key
   - `service_role` key (⚠️ храни в секрете!)

---

### Шаг 2: Настроить базу данных (5-10 минут)

#### Вариант A: Через Dashboard (проще)

1. Открой Supabase Dashboard → SQL Editor
2. Выполни миграции ПО ПОРЯДКУ:
   - Открой `supabase/migrations/001_create_users_table.sql`
   - Скопируй содержимое
   - Вставь в SQL Editor → Run
   - Повтори для файлов 002, 003, 004, 005, 006

#### Вариант B: Через CLI (для продакшена)

```bash
# Установи Supabase CLI
npm install -g supabase

# Войди и свяжи проект
supabase login
supabase link --project-ref your-project-ref

# Примени все миграции
supabase db push
```

**Проверка:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

Должно быть 6 таблиц: users, sessions, user_preferences, search_history, places_cache, donations

**⚠️ ВАЖНО:** Если вы добавляете функционал донатов, примените также миграцию 007:
- См. [APPLY_DONATION_MIGRATION.md](./APPLY_DONATION_MIGRATION.md)

---

### Шаг 3: Deploy Edge Function (10 минут)

#### 3.1. Установи secrets

```bash
# В PowerShell (Windows)
supabase secrets set TELEGRAM_BOT_TOKEN="твой_токен"
supabase secrets set GEMINI_API_KEY="твой_ключ"
supabase secrets set GOOGLE_MAPS_API_KEY="твой_ключ"
supabase secrets set SUPABASE_URL="https://твой-проект.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="твой_service_role_ключ"
```

#### 3.2. Deploy функцию

```bash
cd C:\Projects\SpotFinder
supabase functions deploy telegram-webhook
```

Скопируй URL из вывода:
```
Deployed Function telegram-webhook:
Public URL: https://xxxxx.functions.supabase.co/telegram-webhook
```

---

### Шаг 4: Настроить Telegram webhook (2 минуты)

#### PowerShell (Windows):

```powershell
# IMPORTANT: Use .functions.supabase.co (public, no auth), NOT .supabase.co/functions/v1/ (requires auth)
$TOKEN = "твой_telegram_bot_token"
$WEBHOOK = "https://xxxxx.functions.supabase.co/telegram-webhook"

Invoke-RestMethod -Uri "https://api.telegram.org/bot$TOKEN/setWebhook" `
  -Method Post `
  -ContentType "application/json" `
  -Body (ConvertTo-Json @{
      url = $WEBHOOK
      allowed_updates = @("message", "callback_query", "pre_checkout_query")
  })
```

#### Или используй скрипт:

```bash
# В Git Bash или WSL
# IMPORTANT: Use .functions.supabase.co (public, no auth), NOT .supabase.co/functions/v1/ (requires auth)
TELEGRAM_BOT_TOKEN="твой_токен" \
WEBHOOK_URL="https://xxxxx.functions.supabase.co/telegram-webhook" \
./scripts/setup-webhook.sh
```

**Проверка:**
```powershell
$TOKEN = "твой_токен"
Invoke-RestMethod "https://api.telegram.org/bot$TOKEN/getWebhookInfo"
```

---

### Шаг 5: Тестирование (5 минут)

1. Открой бота в Telegram
2. Отправь `/start`
3. **Ожидание:** Приветственное сообщение + кнопка "Поделиться геолокацией"
4. Нажми кнопку и отправь геолокацию
5. **Ожидание:** "Геолокация получена!"
6. Отправь: "Найди кафе"
7. **Ожидание:** Список кафе с кнопками

**Работает? 🎉 ПОЗДРАВЛЯЮ!**

**Не работает?** Смотри раздел ниже ⬇️

---

## 🐛 Troubleshooting

### Бот не отвечает на сообщения

**Проверка 1: Webhook установлен?**
```powershell
$TOKEN = "твой_токен"
Invoke-RestMethod "https://api.telegram.org/bot$TOKEN/getWebhookInfo"
```

В ответе должен быть `"url": "https://..."`. Если пусто → повтори Шаг 4.

**Проверка 2: Функция работает?**

Открой в браузере:
```
https://твой-проект.functions.supabase.co/telegram-webhook
```

Должна быть ошибка `Method not allowed` (это нормально).

**Проверка 3: Логи**
```bash
supabase functions logs telegram-webhook --tail 20
```

Типичные ошибки:
- `Missing environment variable` → не все secrets установлены (вернись к Шагу 3.1)
- `Invalid API key` → проверь правильность ключей
- `Failed to connect to database` → проверь SUPABASE_SERVICE_ROLE_KEY

### Бот просит геолокацию снова

**Причина:** Прошло >20 минут с момента отправки геолокации (TTL).

**Решение:** Отправь геолокацию заново.

### Бот не находит места

**Проверка 1: Google APIs активированы?**

[Google Cloud Console](https://console.cloud.google.com) → APIs & Services:
- ✅ Generative Language API (Gemini)
- ✅ Places API (New)

**Проверка 2: Биллинг настроен?**

Google Maps Platform требует настройки платежной информации (даже для free tier).

Settings → Billing → Link billing account

### Ошибки в логах "Rate limit exceeded"

**Gemini API:**
- Free tier: 60 запросов в минуту
- Решение: Добавь wait/retry logic или обнови тариф

**Maps API:**
- Проверь квоты в [Console](https://console.cloud.google.com)
- Решение: Включи биллинг или увеличь квоты

---

## 📚 Дополнительные ресурсы

### Документация

- [README.md](./README.md) - Главная документация
- [QUICKSTART.md](./QUICKSTART.md) - Быстрый старт за 15 минут
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Полное руководство по развертыванию
- [TESTING.md](./TESTING.md) - Сценарии тестирования
- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - Полная сводка проекта

### Настройка команд бота (опционально)

```bash
# В Git Bash или WSL
TELEGRAM_BOT_TOKEN="твой_токен" ./scripts/setup-telegram-commands.sh
```

Это добавит команды `/start`, `/help`, `/location` в меню бота.

### Просмотр логов в реальном времени

```bash
supabase functions logs telegram-webhook --follow
```

### Проверка базы данных

Supabase Dashboard → Table Editor:
- `users` - должны появиться пользователи после `/start`
- `sessions` - активные сессии
- `search_history` - история поисков

---

## 🎓 Изучение кода

Начни с этих файлов (в порядке):

1. `supabase/functions/telegram-webhook/index.ts` - точка входа
2. `supabase/functions/_shared/orchestrator.ts` - ядро логики
3. `supabase/functions/_shared/gemini-client.ts` - AI интеграция
4. `supabase/functions/_shared/session-manager.ts` - управление состоянием
5. `supabase/functions/_shared/types.ts` - все типы

---

## 🚀 Готов к продакшену?

Перед запуском для реальных пользователей:

### Production Checklist

- [ ] Все миграции применены
- [ ] Все environment variables настроены
- [ ] Webhook работает стабильно
- [ ] Протестированы все основные сценарии
- [ ] RLS policies включены
- [ ] API квоты настроены
- [ ] Биллинг настроен (alerts на превышение)
- [ ] Backup стратегия определена
- [ ] Monitoring настроен

### Рекомендации

1. **Мониторинг:**
   - Настрой алерты в Supabase Dashboard
   - Отслеживай API usage в Google Cloud Console
   - Проверяй логи регулярно

2. **Бюджет:**
   - Установи budget alerts в Google Cloud
   - Начни с $50-100/месяц лимита
   - Мониторь стоимость первую неделю

3. **Feedback:**
   - Добавь кнопку "Сообщить о проблеме" в боте
   - Собирай отзывы первых пользователей
   - Итерируй на основе feedback

---

## 💡 Что дальше?

### Немедленно (после запуска)

1. Протестируй все сценарии из [TESTING.md](./TESTING.md)
2. Пригласи 5-10 друзей для beta-тестирования
3. Собери feedback
4. Исправь критические баги

### Неделя 1

1. Мониторь логи ежедневно
2. Отслеживай API costs
3. Оптимизируй промпты на основе реальных запросов
4. Добавь недостающие категории мест

### Месяц 1

1. Собери достаточно данных в `search_history`
2. Проанализируй популярные запросы
3. Улучши понимание намерений
4. Добавь unit тесты для критических модулей

### v1.1 (следующий релиз)

- Улучшенное кэширование (geo-hash)
- Analytics dashboard
- A/B тестирование промптов
- Webhook для user feedback

---

## 🙋 Нужна помощь?

### Если застрял

1. Проверь логи: `supabase functions logs telegram-webhook`
2. Перечитай [QUICKSTART.md](./QUICKSTART.md)
3. Посмотри [DEPLOYMENT.md](./DEPLOYMENT.md) для деталей
4. Проверь [TESTING.md](./TESTING.md) для тест-кейсов

### Открой issue

Если нашел баг или нужна помощь:
1. GitHub Issues
2. Telegram: [@your_username]
3. Email: [your-email]

---

## 🎉 Ты почти у цели!

Осталось:
1. ⏱ 15-20 минут на получение API ключей
2. ⏱ 10 минут на setup БД
3. ⏱ 10 минут на deploy
4. ⏱ 5 минут на тестирование

**Итого: ~45 минут до рабочего бота!**

**Удачи! 🚀**

---

**P.S.** Когда запустишь - напиши мне! Буду рад услышать о твоем опыте 😊

