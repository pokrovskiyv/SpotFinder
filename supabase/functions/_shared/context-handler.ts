// Context Handler - manages conversation context and follow-up queries

import { PlaceResult, QuestionType } from './types.ts';
import { formatPlaceDetails } from './telegram-formatter.ts';
import { formatDistance } from './utils.ts';

export class ContextHandler {
  /**
   * Determine the type of follow-up question
   */
  determineQuestionType(question: string): QuestionType {
    const lowerQuestion = question.toLowerCase();
    
    // Сравнительные вопросы
    const comparisonPatterns = [
      /\b(чем|что\s+лучше|сравни|отличается|отличие|разница)\b/i,
      /\b(лучше|хуже|дороже|дешевле|ближе|дальше)\b/i,
      /\b(первый|второй|третий)\s+(и|или)\s+(первый|второй|третий|четвертый|пятый)\b/i,
    ];
    
    if (comparisonPatterns.some(pattern => pattern.test(lowerQuestion))) {
      return 'comparison';
    }
    
    // Вопросы о деталях конкретного места
    const detailPatterns = [
      /\b(какие|какая|какое|какой)\b/i,
      /\b(расскажи|покажи)\s+(подробнее|больше|еще|про|о)\b/i,
      /\b(есть\s+ли|а\s+есть)\b/i,
      /\b(цены|часы|время|парковка|меню|wi-fi|wifi|адрес|рейтинг|отзыв)\b/i,
    ];
    
    if (detailPatterns.some(pattern => pattern.test(lowerQuestion))) {
      return 'detail';
    }
    
    // Общий вопрос (отправится в Gemini)
    return 'general';
  }

  /**
   * Format answer for follow-up question about a specific place
   */
  formatPlaceAnswer(place: PlaceResult, question: string): string {
    const lowerQuestion = question.toLowerCase();

    // Детальная информация
    if (lowerQuestion.includes('подробнее') || lowerQuestion.includes('расскажи больше') || lowerQuestion.includes('покажи больше')) {
      return this.formatDetailedInfo(place);
    }

    // Парковка
    if (lowerQuestion.includes('парковк')) {
      return `🚗 **${place.name}**\n\nИнформация о парковке:\n${this.getParkingInfo(place)}`;
    }

    // Часы работы
    if (lowerQuestion.includes('час') || lowerQuestion.includes('работ') || lowerQuestion.includes('открыт')) {
      return `⏰ **${place.name}**\n\n${this.getOpeningHoursInfo(place)}`;
    }

    // Цены
    if (lowerQuestion.includes('цен') || lowerQuestion.includes('дорог') || lowerQuestion.includes('сколько')) {
      return `💰 **${place.name}**\n\n${this.getPriceInfo(place)}`;
    }

    // Отзывы и рейтинг
    if (lowerQuestion.includes('отзыв') || lowerQuestion.includes('рейтинг')) {
      return `⭐ **${place.name}**\n\n${this.getRatingInfo(place)}`;
    }

    // Адрес
    if (lowerQuestion.includes('адрес') || lowerQuestion.includes('где') || lowerQuestion.includes('находится')) {
      return `📍 **${place.name}**\n\nАдрес: ${place.address || 'Не указан'}`;
    }

    // Меню
    if (lowerQuestion.includes('меню')) {
      return `📋 **${place.name}**\n\nДля просмотра меню рекомендую посетить страницу места в Google Maps или позвонить напрямую.`;
    }

    // Wi-Fi
    if (lowerQuestion.includes('wi-fi') || lowerQuestion.includes('wifi') || lowerQuestion.includes('интернет')) {
      return `📶 **${place.name}**\n\nИнформация о Wi-Fi не найдена. Рекомендую уточнить при посещении или позвонить.`;
    }

    // Default: full info
    return formatPlaceDetails(place);
  }

  /**
   * Format comparison answer for multiple places
   */
  formatComparisonAnswer(places: PlaceResult[], question: string): string {
    if (places.length < 2) {
      return 'Для сравнения нужно минимум два места.';
    }

    const lowerQuestion = question.toLowerCase();
    let response = `🔍 **Сравнение мест**\n\n`;

    // Определяем, что именно сравнивать
    if (lowerQuestion.includes('цен') || lowerQuestion.includes('дорог') || lowerQuestion.includes('дешевле')) {
      response += this.comparePrices(places);
    } else if (lowerQuestion.includes('рейтинг') || lowerQuestion.includes('лучше') || lowerQuestion.includes('хуже')) {
      response += this.compareRatings(places);
    } else if (lowerQuestion.includes('близ') || lowerQuestion.includes('далеко') || lowerQuestion.includes('расстояни')) {
      response += this.compareDistances(places);
    } else {
      // Общее сравнение
      response += this.compareGeneral(places);
    }

    return response;
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
   * Compare prices of multiple places
   */
  private comparePrices(places: PlaceResult[]): string {
    let comparison = '';
    
    for (let i = 0; i < places.length; i++) {
      const place = places[i];
      const priceInfo = place.price_level 
        ? this.formatPriceLevel(place.price_level) 
        : 'Цены не указаны';
      
      comparison += `**${i + 1}. ${place.name}**\n${priceInfo}\n\n`;
    }
    
    // Найти самое дешевое
    const cheapest = places
      .map((p, idx) => ({ place: p, index: idx }))
      .filter(p => p.place.price_level)
      .sort((a, b) => (a.place.price_level || 99) - (b.place.price_level || 99))[0];
    
    if (cheapest) {
      comparison += `💡 Самый бюджетный вариант: **${cheapest.place.name}**`;
    }
    
    return comparison;
  }

  /**
   * Compare ratings of multiple places
   */
  private compareRatings(places: PlaceResult[]): string {
    let comparison = '';
    
    for (let i = 0; i < places.length; i++) {
      const place = places[i];
      const ratingInfo = place.rating 
        ? `⭐ ${place.rating.toFixed(1)}/5` 
        : 'Рейтинг не указан';
      
      comparison += `**${i + 1}. ${place.name}**\n${ratingInfo}\n\n`;
    }
    
    // Найти с лучшим рейтингом
    const best = places
      .map((p, idx) => ({ place: p, index: idx }))
      .filter(p => p.place.rating)
      .sort((a, b) => (b.place.rating || 0) - (a.place.rating || 0))[0];
    
    if (best) {
      comparison += `💡 Наивысший рейтинг: **${best.place.name}** (${best.place.rating?.toFixed(1)}/5)`;
    }
    
    return comparison;
  }

  /**
   * Compare distances of multiple places
   */
  private compareDistances(places: PlaceResult[]): string {
    let comparison = '';
    
    for (let i = 0; i < places.length; i++) {
      const place = places[i];
      const distanceInfo = place.distance 
        ? `📍 ${formatDistance(place.distance)}` 
        : 'Расстояние неизвестно';
      
      comparison += `**${i + 1}. ${place.name}**\n${distanceInfo}\n\n`;
    }
    
    // Найти ближайшее
    const closest = places
      .map((p, idx) => ({ place: p, index: idx }))
      .filter(p => p.place.distance)
      .sort((a, b) => (a.place.distance || 999999) - (b.place.distance || 999999))[0];
    
    if (closest) {
      comparison += `💡 Ближайшее: **${closest.place.name}** (${formatDistance(closest.place.distance!)})`;
    }
    
    return comparison;
  }

  /**
   * General comparison of multiple places
   */
  private compareGeneral(places: PlaceResult[]): string {
    let comparison = '';
    
    for (let i = 0; i < places.length; i++) {
      const place = places[i];
      comparison += `**${i + 1}. ${place.name}**\n`;
      
      if (place.rating) {
        comparison += `⭐ Рейтинг: ${place.rating.toFixed(1)}/5\n`;
      }
      
      if (place.price_level) {
        comparison += `💰 ${this.formatPriceLevel(place.price_level)}\n`;
      }
      
      if (place.distance) {
        comparison += `📍 ${formatDistance(place.distance)}\n`;
      }
      
      if (place.is_open !== undefined) {
        comparison += `🕐 ${place.is_open ? '✅ Открыто' : '❌ Закрыто'}\n`;
      }
      
      comparison += '\n';
    }
    
    return comparison;
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

