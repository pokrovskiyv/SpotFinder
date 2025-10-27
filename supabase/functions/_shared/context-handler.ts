// Context Handler - manages conversation context and follow-up queries

import { PlaceResult } from './types.ts';
import { formatPlaceDetails } from './telegram-formatter.ts';

export class ContextHandler {
  /**
   * Format answer for follow-up question about a specific place
   */
  formatPlaceAnswer(place: PlaceResult, question: string): string {
    const lowerQuestion = question.toLowerCase();

    // Check what user is asking about
    if (lowerQuestion.includes('парковк')) {
      return `🚗 **${place.name}**\n\nИнформация о парковке:\n${this.getParkingInfo(place)}`;
    }

    if (lowerQuestion.includes('час') || lowerQuestion.includes('работ') || lowerQuestion.includes('открыт')) {
      return `⏰ **${place.name}**\n\n${this.getOpeningHoursInfo(place)}`;
    }

    if (lowerQuestion.includes('цен') || lowerQuestion.includes('дорог') || lowerQuestion.includes('сколько')) {
      return `💰 **${place.name}**\n\n${this.getPriceInfo(place)}`;
    }

    if (lowerQuestion.includes('отзыв') || lowerQuestion.includes('рейтинг')) {
      return `⭐ **${place.name}**\n\n${this.getRatingInfo(place)}`;
    }

    if (lowerQuestion.includes('адрес') || lowerQuestion.includes('где') || lowerQuestion.includes('находится')) {
      return `📍 **${place.name}**\n\nАдрес: ${place.address || 'Не указан'}`;
    }

    // Default: full info
    return formatPlaceDetails(place);
  }

  /**
   * Format detailed information about a place
   */
  formatDetailedInfo(place: PlaceResult): string {
    let info = `📍 **${place.name}**\n\n`;

    if (place.address) {
      info += `🏠 **Адрес:**\n${place.address}\n\n`;
    }

    if (place.rating) {
      info += `⭐ **Рейтинг:** ${place.rating.toFixed(1)}/5\n`;
    }

    if (place.price_level) {
      info += `💰 **Ценовая категория:** ${this.formatPriceLevel(place.price_level)}\n`;
    }

    if (place.is_open !== undefined) {
      info += `\n🕐 **Статус:** ${place.is_open ? '✅ Открыто сейчас' : '❌ Закрыто'}\n`;
    }

    return info;
  }

  /**
   * Get parking information
   */
  private getParkingInfo(place: PlaceResult): string {
    // In production, this would query Google Places API for parking info
    // For now, return generic response
    return 'Информация о парковке не найдена. Рекомендую позвонить и уточнить.';
  }

  /**
   * Get opening hours information
   */
  private getOpeningHoursInfo(place: PlaceResult): string {
    if (place.is_open !== undefined) {
      if (place.is_open) {
        return '✅ Сейчас открыто\n\nДля точного расписания рекомендую проверить на Google Maps.';
      } else {
        return '❌ Сейчас закрыто\n\nДля точного расписания рекомендую проверить на Google Maps.';
      }
    }
    return 'Информация о часах работы не найдена.';
  }

  /**
   * Get price information
   */
  private getPriceInfo(place: PlaceResult): string {
    if (!place.price_level) {
      return 'Информация о ценах не найдена.';
    }

    const levels = [
      'Очень бюджетно',
      'Недорого',
      'Средние цены',
      'Выше среднего',
      'Дорого',
    ];

    return `Ценовая категория: ${levels[place.price_level - 1] || 'Не указана'}`;
  }

  /**
   * Get rating information
   */
  private getRatingInfo(place: PlaceResult): string {
    if (!place.rating) {
      return 'Рейтинг не найден.';
    }

    let info = `Рейтинг: ${place.rating.toFixed(1)}/5\n\n`;

    if (place.rating >= 4.5) {
      info += '🌟 Отличный рейтинг! Очень рекомендуют.';
    } else if (place.rating >= 4.0) {
      info += '👍 Хороший рейтинг. Многим нравится.';
    } else if (place.rating >= 3.0) {
      info += '🤔 Средний рейтинг. Отзывы смешанные.';
    } else {
      info += '⚠️ Низкий рейтинг. Будьте осторожны.';
    }

    return info;
  }

  /**
   * Format price level
   */
  private formatPriceLevel(level: number): string {
    const symbols = '💰'.repeat(Math.min(level, 4));
    const levels = [
      'Очень бюджетно',
      'Недорого',
      'Средние цены',
      'Выше среднего',
      'Дорого',
    ];
    return `${symbols} ${levels[level - 1] || 'Не указана'}`;
  }

  /**
   * Detect if query needs previous context
   */
  needsContext(query: string): boolean {
    const contextPatterns = [
      /\b(он|она|оно|там|туда|сюда|этот|тот)\b/i,
      /\b(первый|второй|третий|четвертый|пятый)\b/i,
      /\b(у\s+него|у\s+нее|у\s+них)\b/i,
    ];

    return contextPatterns.some(pattern => pattern.test(query));
  }
}

