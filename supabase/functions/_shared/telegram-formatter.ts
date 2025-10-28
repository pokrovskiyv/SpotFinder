// Telegram Response Formatter - formats data for Telegram messages

import { PlaceResult, PlaceReview, Location } from './types.ts';
import { formatDistance, truncateText, buildMultiStopRouteUrl, hasValidPlaceId } from './utils.ts';
import { InlineButton } from './telegram-client.ts';
import { BUTTONS, MESSAGES } from './constants.ts';

/**
 * Format place results into a readable message
 * If multiple places (>=2), shows all of them numbered
 * Otherwise shows only first place
 */
export function formatPlacesMessage(
  places: PlaceResult[],
  introText?: string,
  showMultiple: boolean = false
): string {
  if (places.length === 0) {
    return '😞 К сожалению, ничего не нашел рядом. Попробуй изменить запрос.';
  }

  // If showing multiple places (route request or multi-place search)
  if (showMultiple && places.length >= 2) {
    const emojiNumbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
    let message = introText ? `${introText}\n\n` : `🔍 Нашел ${places.length} мест:\n\n`;
    
    places.slice(0, 5).forEach((place, index) => {
      message += `${emojiNumbers[index]} **${place.name}**\n`;
      
      const parts: string[] = [];
      if (place.rating) {
        parts.push(`⭐ ${place.rating.toFixed(1)}`);
      }
      if (place.price_level !== undefined) {
        parts.push(getPriceLevel(place.price_level));
      }
      if (place.distance) {
        parts.push(formatDistance(place.distance));
      }
      if (place.is_open !== undefined) {
        parts.push(place.is_open ? '✅ Открыто' : '❌ Закрыто');
      }
      
      if (parts.length > 0) {
        message += parts.join(' • ') + '\n';
      }
      
      message += '\n';
    });
    
    message += '_Можешь спросить подробнее о любом месте или построить маршрут!_';
    return message.trim();
  }

  // Show only first place (default behavior)
  const place = places[0];
  let message = introText ? `${introText}\n\n` : '🔍 Вот что я нашел:\n\n';

  // Add editorial summary if available
  if (place.editorial_summary) {
    message += `📝 ${truncateText(place.editorial_summary, 100)}\n\n`;
  }

  message += `**${place.name}**\n`;

  if (place.rating) {
    message += `⭐ ${place.rating.toFixed(1)}`;
  }

  if (place.price_level !== undefined) {
    message += place.rating ? ` • ${getPriceLevel(place.price_level)}` : `${getPriceLevel(place.price_level)}`;
  }

  if (place.distance) {
    message += (place.rating || place.price_level !== undefined) 
      ? ` • ${formatDistance(place.distance)}`
      : formatDistance(place.distance);
  }

  if (place.is_open !== undefined) {
    message += (place.rating || place.price_level !== undefined || place.distance)
      ? ` • ${place.is_open ? '✅ Открыто' : '❌ Закрыто'}`
      : `${place.is_open ? '✅ Открыто' : '❌ Закрыто'}`;
  }

  if (place.address) {
    message += `\n📍 ${truncateText(place.address, 100)}`;
  }

  if (place.phone_number) {
    message += `\n📞 ${place.phone_number}`;
  }

  if (place.website) {
    message += `\n🌐 [Сайт](${place.website})`;
  }

  // Show notice if details are incomplete
  if (!place.rating && !place.address) {
    message += '\n\n_ℹ️ Детальная информация недоступна, но вы можете посмотреть место на карте_';
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

  // Second row: Directions button (URL button)
  // Use hybrid format: coordinates with place_id hint for best results
  if (hasValidPlaceId(place.place_id) && place.geometry?.location) {
    // Hybrid: coordinates + place_id - shows place card AND allows navigation
    const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${place.geometry.location.lat},${place.geometry.location.lng}&query_place_id=${place.place_id}`;
    buttons.push([{
      text: BUTTONS.DIRECTIONS,
      url: directionsUrl,
    }]);
  } else if (hasValidPlaceId(place.place_id)) {
    // place_id only format - shows full place card
    const directionsUrl = `https://www.google.com/maps/place/?q=place_id:${place.place_id}`;
    buttons.push([{
      text: BUTTONS.DIRECTIONS,
      url: directionsUrl,
    }]);
  } else if (place.geometry?.location) {
    // Fallback to coordinates only if no valid place_id
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.geometry.location.lat},${place.geometry.location.lng}`;
    buttons.push([{
      text: BUTTONS.DIRECTIONS,
      url: directionsUrl,
    }]);
  } else if (place.maps_uri) {
    // Last fallback to Maps URI
    buttons.push([{
      text: BUTTONS.SHOW_ON_MAP,
      url: place.maps_uri,
    }]);
  }

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
  let message = '';

  // Add editorial summary at the start if available
  if (place.editorial_summary) {
    message += `📝 ${place.editorial_summary}\n\n`;
  }

  message += `📍 **${place.name}**\n\n`;

  if (place.address) {
    message += `🏠 Адрес: ${place.address}\n`;
  }

  if (place.phone_number) {
    message += `📞 Телефон: ${place.phone_number}\n`;
  }

  if (place.website) {
    message += `🌐 [Сайт](${place.website})\n`;
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

  return message.trim();
}

/**
 * Format reviews and photos for a place
 */
export function formatReviewsMessage(place: PlaceResult): string {
  let message = `📝 Отзывы о ${place.name}\n\n`;

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

/**
 * Create inline keyboard for donation amounts
 */
export function createDonateButtons(): InlineButton[][] {
  return [
    [
      { text: BUTTONS.DONATE_50, callback_data: 'donate_50' },
      { text: BUTTONS.DONATE_100, callback_data: 'donate_100' },
    ],
    [
      { text: BUTTONS.DONATE_200, callback_data: 'donate_200' },
      { text: BUTTONS.DONATE_500, callback_data: 'donate_500' },
    ],
    [
      { text: BUTTONS.DONATE_1000, callback_data: 'donate_1000' },
      { text: BUTTONS.DONATE_2500, callback_data: 'donate_2500' },
    ],
  ];
}

/**
 * Create donate button for after reviews
 */
export function createDonateButton(): InlineButton[][] {
  return [
    [
      {
        text: '☕ Поддержать проект',
        callback_data: 'donate_menu',
      },
    ],
  ];
}

/**
 * Format route message with place names
 */
export function formatRouteMessage(
  places: PlaceResult[],
  indices?: number[]
): string {
  const selectedPlaces = indices 
    ? indices.map(i => places[i - 1]).filter(Boolean)
    : places;
  
  const count = selectedPlaces.length;
  
  let message = MESSAGES.ROUTE_BUILT(count);
  
  if (count <= 5) {
    message += '\n\n📍 Маршрут:';
    selectedPlaces.forEach((place, index) => {
      message += `\n${index + 1}. ${place.name}`;
    });
  }
  
  return message;
}

/**
 * Create route button with URL
 */
export function createRouteButton(routeUrl: string): InlineButton[][] {
  return [
    [
      {
        text: BUTTONS.ROUTE_CUSTOM,
        url: routeUrl,
      },
    ],
  ];
}

/**
 * Create buttons for multiple places with route option
 */
export function createMultiPlaceButtons(
  places: PlaceResult[],
  userLocation: Location | null
): InlineButton[][] {
  const buttons: InlineButton[][] = [];
  
  // Add buttons for each place (max 5 places)
  // Each place gets a row with "Место N: Отзывы" and "Карта" buttons
  for (let i = 0; i < Math.min(places.length, 5); i++) {
    const place = places[i];
    const placeButtons: InlineButton[] = [];
    
    // "Место N: Отзывы" button
    if (place.place_id) {
      placeButtons.push({
        text: `Место ${i + 1}: Отзывы`,
        callback_data: `reviews_${i}_${place.place_id}`,
      });
    }
    
    // "Карта" button
    if (hasValidPlaceId(place.place_id) && place.geometry?.location) {
      // Hybrid URL format - coordinates + place_id hint
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${place.geometry.location.lat},${place.geometry.location.lng}&query_place_id=${place.place_id}`;
      placeButtons.push({
        text: `Карта`,
        url: mapUrl,
      });
    } else if (place.geometry?.location) {
      // Coordinates only fallback
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${place.geometry.location.lat},${place.geometry.location.lng}`;
      placeButtons.push({
        text: `Карта`,
        url: mapUrl,
      });
    }
    
    // Add row if we have buttons for this place
    if (placeButtons.length > 0) {
      buttons.push(placeButtons);
    }
  }
  
  // Add route button at the end if we have 2+ places
  if (places.length >= 2) {
    try {
      const routeUrl = buildMultiStopRouteUrl(userLocation, places);
      buttons.push([
        {
          text: BUTTONS.ROUTE_ALL,
          url: routeUrl,
        },
      ]);
    } catch (error) {
      console.error('Failed to build route URL:', error);
      // If route building fails, show callback button instead
      buttons.push([
        {
          text: BUTTONS.ROUTE_ALL,
          callback_data: 'route_all_0',
        },
      ]);
    }
  }
  
  return buttons;
}

