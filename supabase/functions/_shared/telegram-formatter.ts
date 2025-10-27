// Telegram Response Formatter - formats data for Telegram messages

import { PlaceResult, PlaceReview } from './types.ts';
import { formatDistance, truncateText } from './utils.ts';
import { InlineButton } from './telegram-client.ts';
import { BUTTONS } from './constants.ts';

/**
 * Format place results into a readable message - show only first place
 */
export function formatPlacesMessage(
  places: PlaceResult[],
  introText?: string
): string {
  if (places.length === 0) {
    return '😞 К сожалению, ничего не нашел рядом. Попробуй изменить запрос.';
  }

  // Show only first place
  const place = places[0];
  let message = introText ? `${introText}\n\n` : '🔍 Вот что я нашел:\n\n';

  message += `**${place.name}**\n`;

  if (place.rating) {
    message += `⭐ ${place.rating.toFixed(1)}`;
  }

  if (place.price_level) {
    message += ` • ${getPriceLevel(place.price_level)}`;
  }

  if (place.distance) {
    message += ` • ${formatDistance(place.distance)}`;
  }

  if (place.is_open !== undefined) {
    message += place.is_open ? ' • ✅ Открыто' : ' • ❌ Закрыто';
  }

  if (place.address) {
    message += `\n📍 ${truncateText(place.address, 100)}`;
  }

  return message.trim();
}

/**
 * Get price level emoji
 */
function getPriceLevel(level: number): string {
  const symbols = '💰'.repeat(Math.min(level, 4));
  return symbols || '💰';
}

/**
 * Create buttons for a place
 */
export function createPlaceButtons(
  place: PlaceResult,
  index: number
): InlineButton[][] {
  const buttons: InlineButton[][] = [];

  // First row: Reviews and Show More buttons
  const row1: InlineButton[] = [];

  if (place.place_id) {
    row1.push({
      text: BUTTONS.REVIEWS,
      callback_data: `reviews_${index}_${place.place_id}`,
    });

    row1.push({
      text: BUTTONS.SHOW_MORE,
      callback_data: `next_${index}`,
    });
  }

  buttons.push(row1);

  return buttons;
}

/**
 * Create buttons for multiple places
 */
export function createPlacesListButtons(places: PlaceResult[]): InlineButton[][] {
  const buttons: InlineButton[][] = [];

  // Create a button for each place (max 5)
  places.slice(0, 5).forEach((place, index) => {
    buttons.push([
      {
        text: `${index + 1}. ${truncateText(place.name, 30)}`,
        callback_data: `select_${index}_${place.place_id}`,
      },
    ]);
  });

  return buttons;
}

/**
 * Format single place details
 */
export function formatPlaceDetails(place: PlaceResult): string {
  let message = `📍 **${place.name}**\n\n`;

  if (place.address) {
    message += `🏠 Адрес: ${place.address}\n`;
  }

  if (place.rating) {
    message += `⭐ Рейтинг: ${place.rating.toFixed(1)}/5\n`;
  }

  if (place.price_level) {
    message += `💰 Цены: ${getPriceLevel(place.price_level)}\n`;
  }

  if (place.distance) {
    message += `📏 Расстояние: ${formatDistance(place.distance)}\n`;
  }

  if (place.is_open !== undefined) {
    message += place.is_open ? '✅ Открыто сейчас\n' : '❌ Закрыто\n';
  }

  return message;
}

/**
 * Format reviews and photos for a place
 */
export function formatReviewsMessage(place: PlaceResult): string {
  let message = `📝 **Отзывы о ${place.name}**\n\n`;

  if (!place.reviews || place.reviews.length === 0) {
    return message + 'К сожалению, отзывы отсутствуют.';
  }

  place.reviews.forEach((review, index) => {
    const emoji = review.sentiment === 'positive' ? '👍' : 
                  review.sentiment === 'negative' ? '👎' : '😐';
    
    message += `${emoji} ${review.author_name} (${review.rating}/5)\n`;
    message += `${review.translated_text || review.text}\n\n`;
  });

  return message.trim();
}

/**
 * Format error message
 */
export function formatErrorMessage(error: string): string {
  return `😕 ${error}\n\nПопробуй:\n• Изменить запрос\n• Уточнить, что именно ищешь\n• Написать /help для справки`;
}

/**
 * Format welcome message with user name
 */
export function formatWelcomeMessage(firstName: string): string {
  return `👋 Привет, ${firstName}! Я SpotFinder - твой AI-ассистент для поиска мест.

Я помогу найти кафе, аптеки, магазины и многое другое рядом с тобой, используя твои запросы на естественном языке.

🔹 Примеры запросов:
• "Найди тихое кафе с Wi-Fi для работы"
• "Где ближайшая аптека, которая открыта?"
• "Хочу недорого поесть"

Чтобы начать, поделись своей геолокацией 📍`;
}

