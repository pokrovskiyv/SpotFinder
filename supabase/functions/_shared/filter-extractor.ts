// Filter Extractor - extracts search filters from user query using Gemini

import { SearchFilters } from './types.ts';

/**
 * Extract search filters from user query using Gemini AI
 */
export async function extractFiltersFromQuery(
  query: string,
  geminiApiKey: string
): Promise<SearchFilters> {
  const prompt = `Извлеки фильтры из запроса пользователя. Верни ТОЛЬКО JSON, без дополнительного текста.

Запрос: "${query}"

Возможные фильтры:
- minRating (number 1-5): минимальный рейтинг
- maxPriceLevel (number 0-4): максимальная цена (0-бесплатно, 1-дёшево, 2-средне, 3-дорого, 4-очень дорого)
- openNow (boolean): только открытые сейчас
- sortBy (string): "rating", "price", "distance" - приоритет сортировки

Примеры:
"рестораны с рейтингом выше 4.5" -> {"minRating": 4.5}
"недорогие кафе" -> {"maxPriceLevel": 2}
"открытые сейчас" -> {"openNow": true}
"лучшие по рейтингу" -> {"sortBy": "rating"}
"самые дешёвые" -> {"sortBy": "price", "maxPriceLevel": 2}
"ближайшие" -> {"sortBy": "distance"}
"кафе" -> {}

Если фильтров нет, верни пустой объект {}.
Верни ТОЛЬКО JSON, ничего больше.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt,
            }],
          }],
          generationConfig: {
            temperature: 0.1, // Low temperature for consistent extraction
            maxOutputTokens: 200,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('Gemini API error:', response.status);
      return {};
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return {};
    }

    // Extract JSON from response (might have markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {};
    }

    const filters = JSON.parse(jsonMatch[0]) as SearchFilters;
    
    // Validate filters
    if (filters.minRating !== undefined) {
      filters.minRating = Math.max(1, Math.min(5, filters.minRating));
    }
    if (filters.maxPriceLevel !== undefined) {
      filters.maxPriceLevel = Math.max(0, Math.min(4, filters.maxPriceLevel));
    }
    if (filters.sortBy && !['rating', 'price', 'distance'].includes(filters.sortBy)) {
      delete filters.sortBy;
    }

    return filters;
  } catch (error) {
    console.error('Error extracting filters:', error);
    return {};
  }
}

