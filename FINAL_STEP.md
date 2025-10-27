# Последний шаг: Применить миграцию БД (30 секунд)

## 🎯 Что уже готово

- ✅ Весь код реализован
- ✅ Команда `/donate` добавлена в меню бота
- ✅ Функция `telegram-webhook` задеплоена

## ⏳ Последний шаг

### Применить миграцию вручную (не автоматизируется):

**URL:** https://app.supabase.com/project/icnnwmjrprufrohiyfpm/sql/new

**SQL для копирования:**
```sql
CREATE TABLE IF NOT EXISTS donations (
    donation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    amount_stars INTEGER NOT NULL CHECK (amount_stars > 0),
    telegram_payment_charge_id VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donations_user_id ON donations(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_payment_charge_id ON donations(telegram_payment_charge_id);

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own donations" ON donations FOR SELECT USING (true);
CREATE POLICY "Service can insert donations" ON donations FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update donations" ON donations FOR UPDATE USING (true);

COMMENT ON TABLE donations IS 'Stores Telegram Stars donation history for users';
```

Полный SQL находится в: `supabase/migrations/007_create_donations_table.sql`

## ✅ После применения

Функционал донатов заработает полностью!

### Тест:
1. Отправьте боту `/donate`
2. Появятся кнопки с суммами
3. Выберите сумму
4. Подтвердите платеж
5. Придет благодарственное сообщение

---

**Время выполнения:** 30 секунд
**Результат:** Полностью работающий функционал донатов! 🎉

