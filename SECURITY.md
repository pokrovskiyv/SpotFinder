# Безопасность проекта SpotFinder

## ⚠️ КРИТИЧЕСКИ ВАЖНО

**НИКОГДА НЕ КОММИТЬТЕ ФАЙЛЫ С РЕАЛЬНЫМИ API КЛЮЧАМИ!**

## Переменные окружения

Все чувствительные данные должны храниться в переменных окружения:

### Обязательные переменные:

```powershell
# Supabase
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "your_service_role_key"

# Telegram
$env:TELEGRAM_BOT_TOKEN = "your_telegram_bot_token"

# Google APIs
$env:GEMINI_API_KEY = "your_gemini_api_key"
$env:GOOGLE_MAPS_API_KEY = "your_google_maps_api_key"
```

### Установка переменных:

**Windows PowerShell:**
```powershell
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "your_service_role_key"
# ... остальные переменные
```

**Windows CMD:**
```cmd
set SUPABASE_URL=https://your-project.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# ... остальные переменные
```

## Использование скриптов

### 1. Скопируйте файлы-примеры:

```powershell
Copy-Item "apply-migration.example.ps1" "apply-migration.ps1"
Copy-Item "verify-migrations.example.ps1" "verify-migrations.ps1"
Copy-Item "install-webhook-correct.example.ps1" "install-webhook-correct.ps1"
```

### 2. Установите переменные окружения

### 3. Запустите скрипты

## Защищенные файлы

Следующие файлы добавлены в `.gitignore` и НЕ должны коммититься:

- `apply-migration.ps1`
- `verify-migrations.ps1`
- `install-webhook-correct.ps1`
- `fix-bot.ps1`
- `set-environment-variables.ps1`
- И другие `.ps1` скрипты с чувствительными данными

## Supabase Secrets

Для продакшена используйте Supabase Secrets:

```bash
supabase secrets set TELEGRAM_BOT_TOKEN="your_token"
supabase secrets set GEMINI_API_KEY="your_key"
supabase secrets set GOOGLE_MAPS_API_KEY="your_key"
supabase secrets set SUPABASE_URL="https://your-project.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
```

## Что делать при утечке ключей

1. **НЕМЕДЛЕННО** ротируйте ключ в Supabase Dashboard
2. Обновите переменные окружения
3. Обновите Supabase Secrets
4. Проверьте логи на подозрительную активность

## Проверка безопасности

Перед коммитом всегда проверяйте:

```bash
# Поиск потенциальных ключей
grep -r "eyJ" . --exclude-dir=node_modules
grep -r "sk-" . --exclude-dir=node_modules
grep -r "AIza" . --exclude-dir=node_modules
```

## Контакты

При обнаружении утечки безопасности немедленно свяжитесь с администратором проекта.
