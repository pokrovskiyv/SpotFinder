# Финальные шаги для запуска донатов

## ✅ Уже выполнено

1. **Код реализован** - все файлы созданы и изменены
2. **Команда `/donate` добавлена** - бот обновлен

## ⏳ Осталось 2 шага

### Шаг 1: Применить миграцию БД (через Dashboard)

1. Откройте: https://app.supabase.com/project/icnnwmjrprufrohiyfpm/sql/new
2. Скопируйте содержимое файла: `supabase/migrations/007_create_donations_table.sql`
3. Вставьте в SQL Editor
4. Нажмите **Run**

**Проверка:**
После выполнения выполните:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'donations';
```

---

### Шаг 2: Применить миграцию кода (через Dashboard)

Код донатов **уже обновлен** в файлах, но функцию нужно редeплойнуть.

#### Вариант 1: Если функция уже развернута

1. Откройте: https://app.supabase.com/project/icnnwmjrprufrohiyfpm/functions
2. Найдите функцию `telegram-webhook`
3. Нажмите на неё
4. Проверьте Environment Variables (см. ниже)
5. Нажмите **Deploy new version** или **Redeploy**

#### Вариант 2: Если функция еще не развернута

**Следуйте инструкции: DEPLOYMENT.md или QUICK_DEPLOY.md**

---

## 🔧 Настройка Environment Variables

Убедитесь, что в функции установлены все переменные:

```
TELEGRAM_BOT_TOKEN=8293206567:AAHhTdSzqSfdPCjIsSSQT0AbakebTZ_lX4c
GEMINI_API_KEY=<из .env.local>
GOOGLE_MAPS_API_KEY=<из .env.local>
SUPABASE_URL=https://icnnwmjrprufrohiyfpm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<из .env.local>
```

---

## ✅ Проверка после всех шагов

1. Откройте бота в Telegram
2. Отправьте `/donate`
3. **Ожидание:** Появятся кнопки с суммами (50, 100, 500 Stars)
4. Выберите любую сумму
5. **Ожидание:** Telegram покажет окно оплаты Stars

---

## 📝 Итог

**Функционал донатов полностью реализован.**

Осталось только:
- Применить миграцию БД (Шаг 1)
- Редeплой функции (Шаг 2)

**После этого всё будет работать!** 🎉

---

## 📚 Дополнительно

- [Docs/Donations.md](./Docs/Donations.md) - Полная документация
- [APPLY_DONATIONS_NOW.md](./APPLY_DONATIONS_NOW.md) - Подробная инструкция
- [QUICK_APPLY_DONATION_MIGRATION.md](./QUICK_APPLY_DONATION_MIGRATION.md) - Быстрая инструкция
- [DONATION_CHECKLIST.md](./DONATION_CHECKLIST.md) - Чеклист

