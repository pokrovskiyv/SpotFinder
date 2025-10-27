# SQL для применения миграции донатов

Скопируйте весь блок ниже и вставьте в Supabase SQL Editor:

---

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

---

**После применения:**
- Обновите команды бота (см. [QUICK_APPLY_DONATION_MIGRATION.md](./QUICK_APPLY_DONATION_MIGRATION.md))
- Редeплойте функцию `telegram-webhook`
- Протестируйте `/donate` команду

