# 🔐 Безопасность токенов и секретов

## ⚠️ КРИТИЧЕСКИ ВАЖНО

**НИКОГДА не коммитьте токены и API ключи в Git!**

---

## Правильные практики

### 1. Используйте переменные окружения

```powershell
# В PowerShell (временно, на сессию)
$env:TELEGRAM_BOT_TOKEN = "your_token_here"

# Для постоянного использования добавьте в профиль PowerShell:
notepad $PROFILE
# Добавьте строку:
# $env:TELEGRAM_BOT_TOKEN = "your_token_here"
```

### 2. НЕ хардкодьте токены в скриптах

❌ **НЕПРАВИЛЬНО:**
```powershell
$token = "7893456781:AAEwp7jAqY8UZGmX62o9DWBS8V1IJYQJrow"  # НЕ ДЕЛАЙТЕ ТАК!
```

✅ **ПРАВИЛЬНО:**
```powershell
$token = $env:TELEGRAM_BOT_TOKEN  # Берем из переменной окружения
if (-not $token) {
    Write-Error "TELEGRAM_BOT_TOKEN not set!"
    exit 1
}
```

### 3. Используйте .env файлы (локально)

Создайте `.env` в корне проекта:
```bash
TELEGRAM_BOT_TOKEN=your_token_here
GEMINI_API_KEY=your_key_here
GOOGLE_MAPS_API_KEY=your_key_here
```

**`.env` УЖЕ в .gitignore** - он не попадет в репозиторий.

### 4. Для продакшна используйте Supabase Secrets

```powershell
# Установите секреты через CLI:
npx supabase@latest secrets set TELEGRAM_BOT_TOKEN="your_token"
npx supabase@latest secrets set GEMINI_API_KEY="your_key"
npx supabase@latest secrets set GOOGLE_MAPS_API_KEY="your_key"
```

Или через веб-интерфейс:
```
https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/vault
```

---

## Что делать если токен попал в Git?

### Если еще НЕ закоммитили (наш случай):

```powershell
# Просто откатите изменения
git restore Docs/scripts/setup-webhook-auto.ps1
```

### Если УЖЕ закоммитили, но НЕ запушили:

```powershell
# Исправьте файл
git add Docs/scripts/setup-webhook-auto.ps1

# Измените последний коммит
git commit --amend --no-edit
```

### Если УЖЕ запушили в GitHub:

🚨 **ТОКЕН СКОМПРОМЕТИРОВАН!**

**Немедленно:**

1. **Сбросьте токен бота в BotFather:**
   ```
   1. Откройте @BotFather в Telegram
   2. /mybots → выберите бота → API Token → Revoke current token
   3. Получите новый токен
   ```

2. **Обновите токен везде:**
   - В переменных окружения
   - В Supabase Secrets
   - Установите новый webhook

3. **Очистите Git историю** (опционально, сложно):
   ```powershell
   # Используйте git-filter-repo или BFG Repo-Cleaner
   # Это сложная операция, проще просто сбросить токен
   ```

---

## Проверка безопасности перед коммитом

```powershell
# Проверьте, нет ли токенов в файлах:
git diff | Select-String -Pattern "AAE|bot\d+:"

# Если нашли - НЕМЕДЛЕННО удалите перед коммитом!
```

---

## Безопасное использование скриптов

### Вариант 1: Через переменную окружения (рекомендуется)

```powershell
# Один раз установите
$env:TELEGRAM_BOT_TOKEN = "your_token"

# Всегда используйте без параметра
.\Docs\scripts\setup-webhook-auto.ps1
.\Docs\scripts\redeploy-function.ps1
```

### Вариант 2: Через параметр (для разовых задач)

```powershell
# Передавайте токен каждый раз
.\Docs\scripts\setup-webhook-auto.ps1 -BotToken "your_token"
```

**НО:** Не сохраняйте такие команды в истории Shell или скриптах!

---

## GitHub Secrets (для CI/CD)

Если используете GitHub Actions:

1. Settings → Secrets and variables → Actions → New repository secret
2. Добавьте:
   - `TELEGRAM_BOT_TOKEN`
   - `GEMINI_API_KEY`
   - `GOOGLE_MAPS_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

## Что безопасно коммитить?

✅ **МОЖНО:**
- Скрипты БЕЗ токенов
- .example файлы с заглушками
- Документацию
- Project ID Supabase (это публичный ID)

❌ **НЕЛЬЗЯ:**
- Токены ботов
- API ключи
- Service Role ключи Supabase
- Пароли
- Любые секреты

---

## Дополнительная безопасность

### 1. Используйте git-secrets

```powershell
# Установите git-secrets для автоматической проверки
# https://github.com/awslabs/git-secrets
```

### 2. Проверяйте перед push

```powershell
# Всегда проверяйте коммиты перед push:
git log -p -1  # Смотрим последний коммит

# Если видите токен - НЕ ПУШЬТЕ!
```

### 3. Регулярно ротируйте токены

- Меняйте токены раз в 3-6 месяцев
- Немедленно меняйте при подозрении на компрометацию

---

## Чеклист перед коммитом

- [ ] Нет токенов в файлах
- [ ] Нет API ключей в файлах
- [ ] .env в .gitignore
- [ ] Все скрипты используют переменные окружения
- [ ] Проверил diff: `git diff`
- [ ] Проверил на токены: `git diff | Select-String -Pattern "AAE|bot\d+:"`

---

## Полезные ссылки

- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [Supabase: Managing Secrets](https://supabase.com/docs/guides/functions/secrets)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)

