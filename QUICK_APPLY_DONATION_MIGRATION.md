# Быстрое применение миграции донатов

## ⚡ Быстрый способ (через Supabase Dashboard)

### Шаг 1: Откройте Supabase Dashboard

Перейдите на: https://app.supabase.com

### Шаг 2: Выберите проект и откройте SQL Editor

1. Нажмите на ваш проект
2. В левом меню выберите **SQL Editor**
3. Нажмите **New query**

### Шаг 3: Скопируйте и вставьте SQL

```sql
-- Create donations table for Telegram Stars payments
CREATE TABLE IF NOT EXISTS donations (
    donation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    amount_stars INTEGER NOT NULL CHECK (amount_stars > 0),
    telegram_payment_charge_id VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_donations_user_id ON donations(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_payment_charge_id ON donations(telegram_payment_charge_id);

-- Enable RLS
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own donations" ON donations 
    FOR SELECT USING (true);

CREATE POLICY "Service can insert donations" ON donations 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update donations" ON donations 
    FOR UPDATE USING (true);

-- Add comment
COMMENT ON TABLE donations IS 'Stores Telegram Stars donation history for users';
```

### Шаг 4: Выполните запрос

Нажмите кнопку **Run** (или `Ctrl+Enter`)

### Шаг 5: Проверьте результат

Выполните запрос для проверки:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'donations';
```

Должна вернуться строка с `donations`.

---

## 📋 Обновление команд бота

После применения миграции, обновите команды бота:

### Вариант A: Через PowerShell скрипт

```powershell
cd c:\Projects\SpotFinder
$env:TELEGRAM_BOT_TOKEN = "YOUR_BOT_TOKEN"
bash scripts/setup-telegram-commands.sh
```

### Вариант B: Через curl (PowerShell)

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

---

## 🚀 Задеплой функции

### Через Supabase Dashboard:

1. Откройте **Functions** в боковом меню
2. Выберите функцию `telegram-webhook`
3. Нажмите **Deploy** (или жмите **Redeploy** если уже задеплоено)

### Через Supabase CLI (если установлен):

```bash
supabase functions deploy telegram-webhook
```

---

## ✅ Проверка

1. Откройте бота в Telegram
2. Отправьте `/donate`
3. Должны появиться кнопки с суммами донатов
4. Выберите любую сумму для теста

---

## 🎉 Готово!

Функционал донатов теперь полностью интегрирован!

**Документация:**
- [Docs/Donations.md](./Docs/Donations.md) - Детальная документация
- [APPLY_DONATION_MIGRATION.md](./APPLY_DONATION_MIGRATION.md) - Полная инструкция

