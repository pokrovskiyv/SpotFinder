# ✅ Чеклист применения функционала донатов

## Статус реализации: 100% ГОТОВО

Все файлы созданы и изменены. Код готов к применению.

---

## 📝 Что нужно сделать (5 минут)

### [ ] 1. Применить миграцию БД

- [ ] Открыть https://app.supabase.com
- [ ] Выбрать проект → SQL Editor → New query
- [ ] Скопировать содержимое `supabase/migrations/007_create_donations_table.sql`
- [ ] Вставить в SQL Editor
- [ ] Нажать Run
- [ ] Проверить: таблица `donations` создана

**SQL код находится в файле:** `supabase/migrations/007_create_donations_table.sql`

---

### [ ] 2. Обновить команды бота

- [ ] Получить TELEGRAM_BOT_TOKEN
- [ ] Выполнить команду обновления (см. ниже)

**Команда для PowerShell:**
```powershell
$TOKEN = "YOUR_BOT_TOKEN"
Invoke-RestMethod -Uri "https://api.telegram.org/bot$TOKEN/setMyCommands" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{
    "commands": [
      {"command": "start", "description": "Начать работу с ботом"},
      {"command": "help", "description": "Справка по использованию"},
      {"command": "location", "description": "Обновить геолокацию"},
      {"command": "donate", "description": "Поддержать бота"}
    ]
  }'
```

- [ ] Проверить: в боте появилась команда `/donate`

---

### [ ] 3. Редeплой функции

- [ ] Открыть Supabase Dashboard
- [ ] Functions → telegram-webhook
- [ ] Нажать Deploy/Redeploy
- [ ] Дождаться завершения деплоя

---

### [ ] 4. Протестировать

- [ ] Открыть бота в Telegram
- [ ] Отправить `/donate`
- [ ] Проверить: появились кнопки с суммами
- [ ] Выбрать сумму (любую)
- [ ] Проверить: появилось окно оплаты
- [ ] Подтвердить платеж
- [ ] Проверить: пришло благодарственное сообщение

---

## 🎯 Результат

После выполнения всех чекбоксов:
- ✅ Функционал донатов работает
- ✅ Команда `/donate` доступна
- ✅ Платежи сохраняются в БД
- ✅ Пользователи получают благодарность
- ✅ История донатов ведется

---

## 📚 Дополнительные файлы

- `APPLY_DONATIONS_NOW.md` - Подробная инструкция
- `QUICK_APPLY_DONATION_MIGRATION.md` - Краткая инструкция
- `SHOW_MIGRATION_SQL.md` - Готовый SQL код
- `Docs/Donations.md` - Документация функционала

---

## ⚠️ Важно

Telegram Stars работает БЕЗ дополнительной настройки:
- Provider token остается пустым `""`
- Валюта: `"XTR"`
- Никаких настроек в BotFather не требуется

Вывод средств:
- Stars накапливаются на счету бота автоматически
- Вывод через [Fragment.com](https://fragment.com)
- Комиссия Telegram: ~30%

---

## ✨ Готово к использованию!

