// Shared utility functions for SpotFinder Bot

import { Location } from './types.ts';
import { LOCATION_TTL_MINUTES } from './constants.ts';

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
 * NO REGEX - uses simple string matching
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
 * Extract multiple ordinal numbers from text for comparison questions
 * (e.g., "первый и третий" -> [1, 3], "сравни 2 и 5" -> [2, 5])
 * NO REGEX - uses simple string matching and manual digit extraction
 */
export function extractMultipleOrdinals(text: string): number[] {
  const ordinals: Record<string, number> = {
    'перв': 1,
    'втор': 2,
    'трет': 3,
    'четверт': 4,
    'пят': 5,
  };

  const lowerText = text.toLowerCase();
  const found: number[] = [];
  
  // Extract digits manually without regex
  let currentNumber = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char >= '0' && char <= '9') {
      currentNumber += char;
    } else {
      if (currentNumber) {
        const num = parseInt(currentNumber);
        if (num >= 1 && num <= 5 && !found.includes(num)) {
          found.push(num);
        }
        currentNumber = '';
      }
    }
  }
  // Check last number
  if (currentNumber) {
    const num = parseInt(currentNumber);
    if (num >= 1 && num <= 5 && !found.includes(num)) {
      found.push(num);
    }
  }

  // Ищем словесные обозначения
  for (const [key, value] of Object.entries(ordinals)) {
    if (lowerText.includes(key) && !found.includes(value)) {
      found.push(value);
    }
  }
  
  // Возвращаем уникальные, отсортированные значения
  return [...new Set(found)].sort((a, b) => a - b);
}

/**
 * Check if message is a follow-up question
 * NO REGEX - uses simple string matching
 */
export function isFollowUpQuestion(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Keywords that indicate follow-up questions
  const followUpKeywords = [
    'у него', 'у нее', 'у них',
    'первый', 'второй', 'третий', 'четвертый', 'пятый',
    'этот', 'этого', 'тот', 'того', 'там', 'тут', 'здесь', 'туда', 'сюда',
    'какие', 'какая', 'какое', 'какой',
    'расскажи подробнее', 'покажи подробнее',
    'есть ли', 'а есть',
    'а цены', 'а часы', 'а время', 'а парковка', 'а меню', 'а wi-fi', 'а wifi',
    'чем', 'что лучше', 'сравни', 'отличается', 'отличие', 'разница',
    'лучше', 'хуже', 'дороже', 'дешевле', 'ближе', 'дальше',
  ];

  return followUpKeywords.some(keyword => lowerText.includes(keyword));
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
 * Detect search type from query to determine which Places API method to use
 * NO REGEX - uses simple string matching
 */
export function detectSearchType(query: string): 'specific_place' | 'nearby' | 'general' {
  const lowerQuery = query.toLowerCase().trim();
  
  // Check for "ближайш" keywords - use Nearby Search (strict radius)
  if (lowerQuery.includes('ближайш') || lowerQuery.includes('рядом') || 
      lowerQuery.includes('около') || lowerQuery.includes('поблизости')) {
    return 'nearby';
  }
  
  // Check if query contains capitalized words (likely specific place name)
  // Example: "Seal Tea в Нови Саде" has multiple capitalized words
  const words = query.split(' ');
  const capitalizedWords = words.filter(word => 
    word.length > 1 && word[0] >= 'A' && word[0] <= 'Z'
  );
  
  // If has 2+ capitalized words and "в", likely specific place search
  if (capitalizedWords.length >= 2 && lowerQuery.includes(' в ')) {
    return 'specific_place';
  }
  
  // Default: general search (Text Search with wider radius)
  return 'general';
}

/**
 * Check if message is a route request
 * NO REGEX - uses simple string matching
 */
export function isRouteRequest(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  const routeKeywords = [
    'построй маршрут', 'построй путь',
    'покажи маршрут', 'покажи путь',
    'проложи маршрут', 'проложи путь',
    'маршрут через', 'путь через',
    'построить маршрут',
  ];
  
  return routeKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Extract place indices from text (e.g., "места 1, 3 и 5" → [1, 3, 5])
 * NO REGEX - uses simple string matching and manual parsing
 */
export function extractPlaceIndices(text: string): number[] {
  const indices: number[] = [];
  const lowerText = text.toLowerCase();
  
  // Look for keywords that indicate we're looking for place numbers
  if (lowerText.includes('места') || lowerText.includes('место') ||
      lowerText.includes('номера') || lowerText.includes('номер') ||
      lowerText.includes('через')) {
    
    // Extract all digits from the text
    let currentNumber = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char >= '0' && char <= '9') {
        currentNumber += char;
      } else {
        if (currentNumber) {
          const num = parseInt(currentNumber);
          if (num >= 1 && num <= 10) { // Reasonable limit
            indices.push(num);
          }
          currentNumber = '';
        }
      }
    }
    // Check last number
    if (currentNumber) {
      const num = parseInt(currentNumber);
      if (num >= 1 && num <= 10) {
        indices.push(num);
      }
    }
  }
  
  // Remove duplicates and sort
  return [...new Set(indices)].sort((a, b) => a - b);
}

/**
 * Check if user wants to see multiple places
 * Patterns: "покажи N мест", "найди N кафе", "N места", "где можно погулять"
 * NO REGEX - uses simple string matching
 */
export function isMultiPlaceRequest(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  const multiPlaceKeywords = [
    'покажи', 'места',
    'несколько мест',
    'где можно погулять',
    'что посмотреть',
    'интересные места',
  ];
  
  // Check for number + "мест" pattern manually
  if (lowerText.includes('мест') && 
      (lowerText.includes('2') || lowerText.includes('3') || 
       lowerText.includes('4') || lowerText.includes('5'))) {
    return true;
  }
  
  return multiPlaceKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Extract number of places from query
 * Returns number or null if not specified
 * Always limits to maximum 5 places for route compatibility
 * NO REGEX - uses simple string matching
 */
export function extractPlaceCount(text: string): number | null {
  const lowerText = text.toLowerCase();
  
  if (!lowerText.includes('мест')) {
    return null;
  }
  
  // Extract numbers manually
  const numbers: number[] = [];
  let currentNumber = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char >= '0' && char <= '9') {
      currentNumber += char;
    } else {
      if (currentNumber) {
        numbers.push(parseInt(currentNumber));
        currentNumber = '';
      }
    }
  }
  if (currentNumber) {
    numbers.push(parseInt(currentNumber));
  }
  
  // Find number near "мест"
  for (const num of numbers) {
    const numIndex = lowerText.indexOf(num.toString());
    const mestoIndex = lowerText.indexOf('мест');
    
    // Number should be near "мест" (within 20 chars)
    if (Math.abs(numIndex - mestoIndex) < 20) {
      // Strict limit: 2-5 places (Google Maps route waypoint limit)
      return Math.min(Math.max(num, 2), 5);
    }
  }
  
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
  if (placeId.length < 20) return false;
  
  // Check alphanumeric without regex - manual validation
  for (let i = 0; i < placeId.length; i++) {
    const char = placeId[i];
    const isAlpha = (char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z');
    const isDigit = char >= '0' && char <= '9';
    const isSpecial = char === '_' || char === '-';
    if (!isAlpha && !isDigit && !isSpecial) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if place_id is valid for use in Google Maps URLs
 * Rejects fake IDs (starting with 'maps_') and too short IDs
 * This is an exported version for use in other modules
 * NO REGEX - uses manual validation
 */
export function hasValidPlaceId(placeId: string | undefined): boolean {
  if (!placeId) return false;
  // Reject fake IDs created by our code
  if (placeId.startsWith('maps_')) return false;
  // Google Place ID should be at least 20 characters
  if (placeId.length < 20) return false;
  
  // Check alphanumeric without regex - manual validation
  for (let i = 0; i < placeId.length; i++) {
    const char = placeId[i];
    const isAlpha = (char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z');
    const isDigit = char >= '0' && char <= '9';
    const isSpecial = char === '_' || char === '-';
    if (!isAlpha && !isDigit && !isSpecial) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if two places are duplicates based on place_id or coordinates
 * Places are considered duplicates if:
 * 1. They have the same valid place_id, OR
 * 2. They have coordinates within ~50 meters of each other
 */
export function arePlacesDuplicate(
  place1: { place_id?: string; geometry?: { location: { lat: number; lng: number } } },
  place2: { place_id?: string; geometry?: { location: { lat: number; lng: number } } }
): boolean {
  // Check by place_id first (most reliable)
  if (place1.place_id && place2.place_id && 
      hasValidPlaceId(place1.place_id) && hasValidPlaceId(place2.place_id)) {
    if (place1.place_id === place2.place_id) {
      return true;
    }
  }
  
  // Check by coordinates (within ~50m)
  if (place1.geometry?.location && place2.geometry?.location) {
    const distance = calculateDistance(
      { lat: place1.geometry.location.lat, lon: place1.geometry.location.lng },
      { lat: place2.geometry.location.lat, lon: place2.geometry.location.lng }
    );
    // 50 meters threshold - same location
    if (distance < 50) {
      return true;
    }
  }
  
  return false;
}

/**
 * Filter out duplicate places from an array
 * Keeps the first occurrence of each unique place
 */
export function deduplicatePlaces<T extends { place_id?: string; geometry?: { location: { lat: number; lng: number } } }>(
  places: T[]
): T[] {
  const unique: T[] = [];
  
  for (const place of places) {
    const isDuplicate = unique.some(existing => arePlacesDuplicate(existing, place));
    if (!isDuplicate) {
      unique.push(place);
    }
  }
  
  return unique;
}

/**
 * Check if a place is in the shown places list by place_id or coordinates
 */
export function isPlaceShown(
  place: { place_id?: string; geometry?: { location: { lat: number; lng: number } } },
  shownPlaces: Array<{ place_id?: string; geometry?: { location: { lat: number; lng: number } } }>
): boolean {
  return shownPlaces.some(shown => arePlacesDuplicate(place, shown));
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
      const placeName = (place as any).name || 'unknown';
      console.warn(`  - Waypoint ${i + 1}: skipped (no coordinates for "${placeName}")`);
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

