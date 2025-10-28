# Функционал донатов через Telegram Stars

## Обзор

SpotFinder поддерживает получение донатов через **Telegram Stars** - внутреннюю валюту Telegram для поддержки ботов.

## Как это работает

1. Пользователь отправляет команду `/donate` или нажимает кнопку "Поддержать бота"
2. Бот показывает варианты сумм: 50, 100, 500 Stars или кастомная сумма
3. Пользователь выбирает сумму и подтверждает платеж
4. Telegram обрабатывает платеж
5. Бот сохраняет донат в базу данных и благодарит пользователя
6. Stars зачисляются на счет бота автоматически

## Хранение данных

Все донаты сохраняются в таблице `donations`:
- `donation_id` - уникальный ID доната
- `user_id` - ID пользователя
- `amount_stars` - сумма в Stars
- `telegram_payment_charge_id` - ID платежа Telegram (уникальный)
- `status` - статус (completed, pending, refunded)
- `created_at` - дата создания

## Безопасность

- Проверка дубликатов платежей по `telegram_payment_charge_id`
- Валидация суммы (1-2500 Stars)
- Автоматическое подтверждение платежей через `pre-checkout-query`

## Вывод средств

Stars накапливаются автоматически на счету бота в Telegram. Для вывода:

1. Перейти на [Fragment.com](https://fragment.com)
2. Войти через свой Telegram аккаунт
3. Привязать способ вывода (банковская карта или криптокошелек)
4. Вывести средства (минимум ~1000 Stars)

Комиссия Telegram: ~30%

## Реализация

### Файлы

- `supabase/migrations/007_create_donations_table.sql` - миграция БД
- `supabase/functions/_shared/donation-manager.ts` - менеджер донатов
- `supabase/functions/_shared/orchestrator.ts` - обработка команды и платежей
- `supabase/functions/_shared/telegram-client.ts` - методы для инвойсов
- `supabase/functions/_shared/types.ts` - типы для платежей
- `supabase/functions/_shared/constants.ts` - константы донатов
- `supabase/functions/_shared/telegram-formatter.ts` - форматирование сообщений

### Команды

- `/donate` - показать варианты донатов

### Кнопки

- ⭐ 50 Stars
- ⭐ 100 Stars
- ⭐ 500 Stars
- 💎 Своя сумма (в разработке)

## Применение миграции

```bash
# Применить миграцию в Supabase
supabase db push

# Или через SQL Editor в Supabase Dashboard
# Скопировать содержимое 007_create_donations_table.sql
```

## Настройка команд бота

```bash
# Добавить команду /donate в меню бота
./scripts/setup-telegram-commands.sh
```

## Тестирование

1. Отправьте `/donate` боту
2. Выберите сумму из кнопок
3. Подтвердите платеж в Telegram
4. Проверьте, что пришло благодарственное сообщение
5. Проверьте таблицу `donations` в БД

## Статистика

Можно получить статистику донатов через методы `DonationManager`:
- `getUserDonations(userId)` - все донаты пользователя
- `getTotalDonations(userId)` - общая сумма донатов пользователя


