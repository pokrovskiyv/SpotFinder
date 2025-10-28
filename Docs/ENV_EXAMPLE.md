# SpotFinder Environment Variables Template
# Скопируйте этот файл в .env и заполните значения

# =============================================================================
# TELEGRAM BOT CONFIGURATION
# =============================================================================

# Токен бота от @BotFather в Telegram
# Получить: https://t.me/BotFather -> /newbot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# =============================================================================
# GOOGLE APIS CONFIGURATION  
# =============================================================================

# API ключ для Google Gemini AI
# Получить: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# API ключ для Google Maps
# Получить: https://console.cloud.google.com/apis/credentials
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# =============================================================================
# SUPABASE CONFIGURATION
# =============================================================================

# URL вашего Supabase проекта
# Формат: https://your-project-id.supabase.co
SUPABASE_URL=https://your-project-id.supabase.co

# Service Role ключ (НЕ anon key!)
# Получить: Supabase Dashboard -> Settings -> API -> service_role secret
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# ID проекта Supabase (извлекается из URL автоматически)
# Используется для генерации webhook URL
SUPABASE_PROJECT_ID=your_project_id_here

# =============================================================================
# ENVIRONMENT CONFIGURATION
# =============================================================================

# Окружение: development, staging, production
# По умолчанию: production
ENVIRONMENT=development

# =============================================================================
# LOCAL DEVELOPMENT SETUP
# =============================================================================

# Для локальной разработки используйте эти значения:
# SUPABASE_URL=http://localhost:54321
# ENVIRONMENT=development
# SUPABASE_PROJECT_ID=local

# =============================================================================
# SECURITY NOTES
# =============================================================================

# ⚠️  ВАЖНО: Никогда не коммитьте .env файл в Git!
# ⚠️  Используйте .env.example как шаблон
# ⚠️  Для production используйте GitHub Secrets или переменные окружения сервера

# =============================================================================
# QUICK SETUP COMMANDS
# =============================================================================

# 1. Скопируйте этот файл:
#    cp .env.example .env

# 2. Заполните все значения выше

# 3. Для локальной разработки:
#    supabase start
#    npm run dev

# 4. Для настройки webhook:
#    npm run webhook:setup

# 5. Для тестирования:
#    npm run test