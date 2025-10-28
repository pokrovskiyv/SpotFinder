// Shared constants for SpotFinder Bot

// Time-related constants
export const LOCATION_TTL_MINUTES = 20; // Location expires after 20 minutes
export const SESSION_TTL_MINUTES = 30; // Session expires after 30 minutes
export const CACHE_TTL_HOURS = 24; // Place cache expires after 24 hours

// Distance constants (in meters)
export const DEFAULT_SEARCH_RADIUS = 1000; // 1 km
export const MAX_SEARCH_RADIUS = 5000; // 5 km
export const NEARBY_THRESHOLD = 500; // 500 meters is "nearby"

// Smart search constants
export const SEARCH_RADIUS_STEPS = [1000, 2000, 3000, 5000]; // Шаги расширения радиусов
export const MIN_RESULTS_THRESHOLD = 3; // Минимум результатов для остановки расширения

// Telegram constants
export const TELEGRAM_API_BASE = 'https://api.telegram.org';
export const MAX_MESSAGE_LENGTH = 4096;

// Gemini API constants
export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
export const GEMINI_MODEL = 'gemini-2.0-flash-exp'; // Latest experimental model with Maps Grounding support
export const GEMINI_MAX_TOKENS = 2048;

// Google Maps constants
export const MAPS_API_BASE = 'https://maps.googleapis.com/maps/api';

// MVP Category limitations
export const ALLOWED_CATEGORIES = [
  'food', // Еда (кафе, рестораны)
  'pharmacy', // Аптеки
  'atm', // Банкоматы
  'bank', // Банки
  'store', // Магазины
  'entertainment', // Развлечения
] as const;

export type AllowedCategory = typeof ALLOWED_CATEGORIES[number];

// Response templates (Russian)
export const MESSAGES = {
  WELCOME: `👋 Привет! Я SpotFinder - твой AI-ассистент для поиска мест.

Я помогу найти кафе, аптеки, магазины и многое другое рядом с тобой.

Чтобы начать, поделись своей геолокацией 📍`,

  LOCATION_REQUEST: `📍 Чтобы я мог найти что-то рядом с тобой, пожалуйста, отправь свою геолокацию.

Нажми на скрепку (📎) → Геолокация`,

  LOCATION_EXPIRED: `⏰ Твоя геолокация устарела (прошло более ${LOCATION_TTL_MINUTES} минут).

Пожалуйста, отправь свою текущую геолокацию заново.`,

  LOCATION_RECEIVED: `✅ Геолокация получена! Теперь можешь спрашивать что угодно:

• "Найди кофейню с Wi-Fi"
• "Где ближайшая аптека?"
• "Хочу поесть что-то вкусное"`,

  PROCESSING: '🔍 Ищу...',
  
  ERROR_GENERIC: '😕 Упс, что-то пошло не так. Попробуй еще раз.',
  
  ERROR_NO_RESULTS: '😞 К сожалению, ничего не нашел рядом. Попробуй изменить запрос.',

  HELP: `❓ Как пользоваться ботом:

1️⃣ Отправь свою геолокацию
2️⃣ Напиши, что ищешь в свободной форме
3️⃣ Получи результаты с кнопками действий

Примеры запросов:
• "Тихое кафе для работы"
• "Аптека, которая открыта сейчас"
• "Где поесть недорого?"

Команды:
/start - Начать заново
/help - Эта справка
/donate - Поддержать бота`,

  DONATE_INFO: `⭐ Поддержать SpotFinder

Ваш донат помогает развивать бота и добавлять новые функции!

Выберите сумму:`,
  
  DONATE_THANK_YOU: (amount: number, total: number) => 
    `🎉 Спасибо за ваш донат!

Вы поддержали SpotFinder на ${amount} ⭐

Ваш общий вклад: ${total} ⭐

Ваша поддержка помогает развивать бота и делать его лучше! 🙏`,

  DONATE_CUSTOM_AMOUNT: `💎 Введите сумму доната (от 1 до 2500 Stars):`,
  
  DONATE_INVALID_AMOUNT: `❌ Неверная сумма!

Доступный диапазон: 1 - 2500 Stars`,
} as const;

// Button labels
export const BUTTONS = {
  SHARE_LOCATION: '📍 Поделиться геолокацией',
  SHOW_ON_MAP: '🗺 Показать на карте',
  GET_DIRECTIONS: '🚶 Как добраться',
  DIRECTIONS: '🗺️ Как добраться',
  CALL: '📞 Позвонить',
  MORE_INFO: 'ℹ️ Подробнее',
  REVIEWS: '📝 Отзывы',
  SHOW_MORE: '➡️ Показать ещё',
  DONATE_50: '⭐ 50 Stars',
  DONATE_100: '⭐ 100 Stars',
  DONATE_200: '⭐ 200 Stars',
  DONATE_500: '⭐ 500 Stars',
  DONATE_1000: '⭐ 1000 Stars',
  DONATE_2500: '⭐ 2500 Stars',
} as const;

// Donation amounts (in Stars)
export const DONATE_AMOUNTS = [50, 100, 200, 500, 1000, 2500] as const;

