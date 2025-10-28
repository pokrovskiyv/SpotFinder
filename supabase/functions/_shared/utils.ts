// Shared utility functions for SpotFinder Bot

import { Location } from './types.ts';
import { LOCATION_TTL_MINUTES, CITY_ALIASES } from './constants.ts';

/**
 * Check if location is still valid (not expired)
 */
export function isLocationValid(locationTimestamp: string | null): boolean {
  if (!locationTimestamp) return false;
  
  const timestamp = new Date(locationTimestamp);
  const now = new Date();
  const diffMinutes = (now.getTime() - timestamp.getTime()) / (1000 * 60);
  
  return diffMinutes <= LOCATION_TTL_MINUTES;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  point1: Location,
  point2: Location
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (point1.lat * Math.PI) / 180;
  const φ2 = (point2.lat * Math.PI) / 180;
  const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
  const Δλ = ((point2.lon - point1.lon) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} м`;
  }
  return `${(meters / 1000).toFixed(1)} км`;
}

/**
 * Extract ordinal number from text (e.g., "второй" -> 2, "первая" -> 1)
 */
export function extractOrdinal(text: string): number | null {
  const ordinals: Record<string, number> = {
    'перв': 1,
    'втор': 2,
    'трет': 3,
    'четверт': 4,
    'пят': 5,
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
  };

  const lowerText = text.toLowerCase();
  for (const [key, value] of Object.entries(ordinals)) {
    if (lowerText.includes(key)) {
      return value;
    }
  }
  
  return null;
}

/**
 * Check if message is a follow-up question
 */
export function isFollowUpQuestion(text: string): boolean {
  const followUpPatterns = [
    /\bу\s+(него|нее|них|первого|второго|третьего)\b/i,
    /\b(первый|второй|третий|четвертый|пятый)\b/i,
    /\b(этот|тот|там)\b/i,
    /\b(туда|сюда)\b/i,
  ];

  return followUpPatterns.some(pattern => pattern.test(text));
}

/**
 * Generate geo-hash for caching (simple implementation)
 * Rounds coordinates to 3 decimal places (~100m precision)
 */
export function generateGeoHash(location: Location): string {
  const lat = location.lat.toFixed(3);
  const lon = location.lon.toFixed(3);
  return `${lat},${lon}`;
}

/**
 * Truncate text to max length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Parse JSON safely
 */
export function safeJSONParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Sleep/delay function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get current time of day context
 */
export function getTimeContext(): string {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 12) return 'утро';
  if (hour >= 12 && hour < 18) return 'день';
  if (hour >= 18 && hour < 23) return 'вечер';
  return 'ночь';
}

/**
 * Validate environment variables
 */
export function validateEnv(env: Record<string, string | undefined>, required: string[]): void {
  const missing = required.filter(key => !env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Extract city name from user query
 * Recognizes patterns like "в Москве", "кафе в Питере", "рестораны Москвы", "по Нови Саду"
 * Supports both Cyrillic (Russian) and Latin (international) city names
 * Returns canonical city name or null if no city found
 */
export function extractCityFromQuery(query: string): string | null {
  const lowerQuery = query.toLowerCase().trim();
  
  // First, check for direct city mentions in any case (known Russian cities)
  for (const [alias, cityName] of Object.entries(CITY_ALIASES)) {
    // Check if the alias appears in the query as a whole word
    const aliasPattern = new RegExp(`\\b${alias}\\b`);
    if (aliasPattern.test(lowerQuery)) {
      console.log(`City extracted from query by alias: "${alias}" -> "${cityName}"`);
      return cityName;
    }
  }
  
  // Expanded patterns for any cities (Russian and Latin, multi-word)
  const patterns = [
    // "в Москве", "в Нови Саде", "в Paris"
    /\bв\s+([а-яёА-ЯЁa-zA-Z]+(?:[-\s][а-яёА-ЯЁa-zA-Z]+)*(?:е|и|а|ы)?)\b/i,
    // "по Москве", "по Нови Саду"
    /\bпо\s+([а-яёА-ЯЁa-zA-Z]+(?:[-\s][а-яёА-ЯЁa-zA-Z]+)*(?:у)?)\b/i,
    // At the end of query: "кафе Москвы", "места Нови Сада"
    /\b([а-яёА-ЯЁa-zA-Z]+(?:[-\s][а-яёА-ЯЁa-zA-Z]+)*(?:ы|а|у|ом)?)$/i,
  ];
  
  for (const pattern of patterns) {
    const match = lowerQuery.match(pattern);
    if (match && match[1]) {
      let candidate = match[1];
      
      // Remove endings for checking in CITY_ALIASES (Russian grammatical cases)
      const cleanedCandidate = candidate.toLowerCase().replace(/[еиаыуом]+$/, '');
      
      // Check if it's in known cities (Russian aliases)
      if (CITY_ALIASES[cleanedCandidate]) {
        console.log(`City extracted: "${candidate}" -> "${CITY_ALIASES[cleanedCandidate]}"`);
        return CITY_ALIASES[cleanedCandidate];
      }
      
      // If not in known cities, return as is (universal case for international cities)
      // Capitalize first letter of each word
      candidate = candidate
        .split(/[-\s]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      
      console.log(`City extracted (universal): "${candidate}"`);
      return candidate;
    }
  }
  
  console.log(`No city found in query: "${query}"`);
  return null;
}

/**
 * Check if message is a route request
 */
export function isRouteRequest(text: string): boolean {
  const routePatterns = [
    /построй\s+маршрут/i,
    /построй\s+путь/i,
    /покажи\s+маршрут/i,
    /покажи\s+путь/i,
    /проложи\s+маршрут/i,
    /проложи\s+путь/i,
    /маршрут\s+через/i,
    /путь\s+через/i,
  ];
  
  return routePatterns.some(pattern => pattern.test(text));
}

/**
 * Extract place indices from text (e.g., "места 1, 3 и 5" → [1, 3, 5])
 */
export function extractPlaceIndices(text: string): number[] {
  const indices: number[] = [];
  
  // Паттерны для поиска номеров
  const patterns = [
    /места?\s+(\d+(?:\s*,\s*\d+)*(?:\s+и\s+\d+)?)/i, // "места 1, 3 и 5"
    /номера?\s+(\d+(?:\s*,\s*\d+)*(?:\s+и\s+\d+)?)/i, // "номера 1, 3 и 5"
    /через\s+(\d+(?:\s*,\s*\d+)*(?:\s+и\s+\d+)?)/i, // "через 1, 3 и 5"
    /(\d+(?:\s*,\s*\d+)*(?:\s+и\s+\d+))/i, // "1, 3 и 5" без предлога
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      // Извлекаем все цифры
      const nums = match[1].match(/\d+/g);
      if (nums) {
        indices.push(...nums.map(n => parseInt(n)));
      }
      break;
    }
  }
  
  // Удаляем дубликаты и сортируем
  return [...new Set(indices)].sort((a, b) => a - b);
}

/**
 * Check if user wants to see multiple places
 * Patterns: "покажи N мест", "найди N кафе", "N места", "где можно погулять"
 */
export function isMultiPlaceRequest(text: string): boolean {
  const multiPlacePatterns = [
    /покажи\s+\d+\s+мест/i,
    /найди\s+\d+/i,
    /\d+\s+мест/i,
    /несколько\s+мест/i,
    /где\s+можно\s+погулять/i, // exploration patterns
    /что\s+посмотреть/i,
    /интересные\s+места/i,
  ];
  
  return multiPlacePatterns.some(pattern => pattern.test(text));
}

/**
 * Extract number of places from query
 * Returns number or null if not specified
 * Always limits to maximum 5 places for route compatibility
 */
export function extractPlaceCount(text: string): number | null {
  const countMatch = text.match(/(\d+)\s+мест/i);
  if (countMatch) {
    const count = parseInt(countMatch[1]);
    // Strict limit: 2-5 places (Google Maps route waypoint limit)
    return Math.min(Math.max(count, 2), 5);
  }
  // Default for exploration queries without specific number
  return null;
}

/**
 * Validate Google Place ID
 * Place IDs should be at least 20 characters and match the expected pattern
 * Rejects temporary fake IDs created by our code (starting with 'maps_')
 */
function isValidPlaceId(placeId: string | undefined): boolean {
  if (!placeId) return false;
  // Reject temporary fake IDs created by our code
  if (placeId.startsWith('maps_')) return false;
  // Google Place ID should be at least 20 characters
  // Usually starts with ChIJ and is 23-27 characters long
  return placeId.length >= 20 && /^[A-Za-z0-9_-]+$/.test(placeId);
}

/**
 * Check if place_id is valid for use in Google Maps URLs
 * Rejects fake IDs (starting with 'maps_') and too short IDs
 * This is an exported version for use in other modules
 */
export function hasValidPlaceId(placeId: string | undefined): boolean {
  if (!placeId) return false;
  // Reject fake IDs created by our code
  if (placeId.startsWith('maps_')) return false;
  // Google Place ID should be at least 20 characters
  return placeId.length >= 20 && /^[A-Za-z0-9_-]+$/.test(placeId);
}

/**
 * Build Google Maps URL for multi-stop route
 * NOTE: We build URL manually to avoid URLSearchParams encoding issues with place_id:
 * place_id:ChIJ... must NOT be encoded (: should stay as :, not %3A)
 */
export function buildMultiStopRouteUrl(
  userLocation: Location | null,
  places: Array<{ place_id?: string; geometry?: { location: { lat: number; lng: number } } }>,
  indices?: number[]
): string {
  // Фильтруем места по индексам если указаны
  const selectedPlaces = indices 
    ? indices.map(i => places[i - 1]).filter(Boolean)
    : places;
  
  if (selectedPlaces.length < 2) {
    throw new Error('Нужно минимум 2 места для маршрута');
  }
  
  console.log(`Building route URL for ${selectedPlaces.length} places`);
  
  // Build URL manually to avoid encoding issues with place_id:
  let url = 'https://www.google.com/maps/dir/?api=1';
  
  // Add origin if we have user location
  if (userLocation) {
    url += `&origin=${userLocation.lat},${userLocation.lon}`;
    console.log(`  - Origin: ${userLocation.lat},${userLocation.lon}`);
  }
  
  // Build waypoints (all places except the last one)
  // Always use coordinates - most reliable method (place_id from Gemini often doesn't work)
  const waypoints: string[] = [];
  for (let i = 0; i < selectedPlaces.length - 1; i++) {
    const place = selectedPlaces[i];
    
    if (place.geometry?.location) {
      const waypoint = `${place.geometry.location.lat},${place.geometry.location.lng}`;
      waypoints.push(waypoint);
      console.log(`  - Waypoint ${i + 1}: ${waypoint} (coordinates)`);
    } else {
      console.warn(`  - Waypoint ${i + 1}: skipped (no coordinates for "${place.name || 'unknown'}")`);
    }
  }
  
  // Last place is the destination
  // Always use coordinates - place_id: format doesn't work reliably in Directions API
  const lastPlace = selectedPlaces[selectedPlaces.length - 1];
  let destination: string;
  
  if (lastPlace.geometry?.location) {
    // Use coordinates for destination - works reliably for all places
    destination = `${lastPlace.geometry.location.lat},${lastPlace.geometry.location.lng}`;
    console.log(`  - Destination: ${destination} (coordinates)`);
  } else {
    throw new Error('Невозможно построить маршрут - нет координат для последнего места');
  }
  
  url += `&destination=${destination}`;
  
  // Add waypoints if any - use %7C as separator (URL-encoded |)
  if (waypoints.length > 0) {
    url += `&waypoints=${waypoints.join('%7C')}`;
  }
  
  // Set travel mode
  url += '&travelmode=walking';
  
  console.log(`Built route URL: ${url}`);
  
  return url;
}

